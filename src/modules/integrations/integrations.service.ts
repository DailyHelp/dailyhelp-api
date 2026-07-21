import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  NormalizedVerification,
  PaymentGatewayService,
} from '../payments/payment-gateway.service';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Conversation, Offer } from '../conversations/conversations.entity';
import { EntityManager, EntityRepository, LockMode } from '@mikro-orm/core';
import {
  OfferStatus,
  PaymentPurpose,
  PLATFORM_COMMISSION_RATE,
  SERVICE_FEE_FLAT,
  TransactionStatus,
  TransactionType,
} from 'src/types';
import { Transaction, Wallet } from '../wallet/wallet.entity';
import { v4 } from 'uuid';
import { Job, JobTimeline } from '../jobs/jobs.entity';
import { Users } from '../users/users.entity';
import { generateOtp } from 'src/utils';
import { Payment } from '../../entities/payment.entity';
import { SocketGateway } from '../ws/socket.gateway';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly paymentGateway: PaymentGatewayService,
    @InjectRepository(Payment)
    private readonly paymentRepository: EntityRepository<Payment>,
    @InjectRepository(Wallet)
    private readonly walletRepository: EntityRepository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: EntityRepository<Transaction>,
    @InjectRepository(Offer)
    private readonly offerRepository: EntityRepository<Offer>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: EntityRepository<Conversation>,
    @InjectRepository(Job)
    private readonly jobRepository: EntityRepository<Job>,
    @InjectRepository(JobTimeline)
    private readonly jobTimelineRepository: EntityRepository<JobTimeline>,
    @InjectRepository(Users)
    private readonly usersRepository: EntityRepository<Users>,
    private readonly em: EntityManager,
    private readonly ws: SocketGateway,
  ) {}

  async handlePaystackWebhook(req: Request, res: Response) {
    if (!this.paymentGateway.verifyPaystackSignature(req))
      return res.status(400).send('Invalid signature');
    const parsed = this.paymentGateway.parsePaystackWebhook(req.body);
    if (parsed.type === 'charge') {
      const verified = await this.paymentGateway.verifyWithPaystack(
        parsed.reference,
      );
      if (!verified.success) return res.status(200).send('Not successful');
      await this.processCharge(verified);
      return res.status(200).send('OK');
    }
    if (parsed.type === 'transfer') {
      await this.processTransferEvent(parsed);
      return res.status(200).send('OK');
    }
    return res.status(200).send('OK');
  }

  async handleFlutterwaveWebhook(req: Request, res: Response) {
    if (!this.paymentGateway.verifyFlutterwaveSignature(req))
      return res.status(401).send('Invalid signature');
    const parsed = this.paymentGateway.parseFlutterwaveWebhook(req.body);
    if (parsed.type === 'charge') {
      const verified = await this.paymentGateway.verifyWithFlutterwave(
        parsed.reference,
      );
      if (!verified.success) return res.status(200).send('Not successful');
      await this.processCharge(verified);
      return res.status(200).send('OK');
    }
    if (parsed.type === 'transfer') {
      await this.processTransferEvent(parsed);
      return res.status(200).send('OK');
    }
    return res.status(200).send('OK');
  }

  async processTransferEvent(data: {
    reference: string;
    status: 'success' | 'failed';
    amountNaira: number;
  }) {
    const transaction = await this.transactionRepository.findOne({
      uuid: data.reference,
    });
    if (!transaction) throw new NotFoundException(`Transaction not found`);
    const wallet = await this.walletRepository.findOne({
      uuid: transaction.wallet?.uuid,
    });
    switch (data.status) {
      case 'success':
        transaction.status = TransactionStatus.SUCCESS;
        wallet.totalBalance -= Number(data.amountNaira);
        break;
      case 'failed':
        transaction.status = TransactionStatus.FAILED;
        wallet.availableBalance += Number(data.amountNaira);
        break;
    }
    await this.em.flush();
  }

  async processCharge(v: NormalizedVerification) {
    // Settle the whole charge atomically. Either the payment, the offer/job (or
    // wallet credit) all commit together, or nothing does. Previously the status
    // was flipped to `processing` and committed BEFORE the offer/job work, so any
    // failure downstream left a paid-but-unsettled order that could never recover
    // (the early-return on `processing` blocked every webhook retry).
    let jobPayload: any = null;
    await this.em.transactional(async (em) => {
      // Lock the payment row so concurrent webhook deliveries can't double-settle.
      const payment = await em.findOne(
        Payment,
        { reference: v.reference },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!payment) return;
      if (payment.status === 'success') return;

      const offerUuid = payment.offer?.uuid;
      if (offerUuid) {
        const existingSettlement = await em.findOne(Payment, {
          offer: { uuid: offerUuid },
          status: { $in: ['success', 'processing'] },
          uuid: { $ne: payment.uuid },
        });
        if (existingSettlement) {
          const meta = payment.metadata ? JSON.parse(payment.metadata) : {};
          payment.status = 'failed';
          payment.transactionId = v.transactionId;
          payment.processedAt = new Date();
          payment.channel = v.channel;
          payment.metadata = JSON.stringify({
            ...meta,
            duplicatePayment: true,
          });
          return;
        }
      }

      const paidAmount = Number(v.amountNaira);
      if (paidAmount !== Number(payment.amount)) {
        payment.status = 'failed';
        return;
      }

      payment.transactionId = v.transactionId;
      const purpose: PaymentPurpose =
        payment.metadata && JSON.parse(payment.metadata).purpose;
      if (purpose === PaymentPurpose.FUND_WALLET) {
        await this.creditWallet(em, payment, v);
      } else if (purpose === PaymentPurpose.JOB_OFFER) {
        jobPayload = await this.acceptOfferAndCreateJob(em, payment, v);
      } else {
        payment.status = 'failed';
        return;
      }
      payment.status = 'success';
      payment.processedAt = new Date();
    });

    // Fire the realtime notification only after the settlement is durably
    // committed, and never let a socket error roll back a completed payment.
    if (jobPayload) {
      try {
        this.ws.jobCreated(jobPayload);
      } catch (err) {
        console.error('jobCreated socket emit failed after settlement', err);
      }
    }
  }

  private async creditWallet(
    em: EntityManager,
    payment: Payment,
    v: NormalizedVerification,
  ) {
    const wallet = await em.findOne(Wallet, {
      user: { uuid: payment.user?.uuid },
      userType: payment.userType,
    });
    if (!wallet) throw new NotFoundException(`Wallet not found`);
    const existingTransaction = await em.findOne(Transaction, {
      payment: { uuid: payment.uuid },
      type: TransactionType.CREDIT,
      status: { $in: [TransactionStatus.SUCCESS, TransactionStatus.PENDING] },
    });
    const currentMetadata = payment.metadata ? JSON.parse(payment.metadata) : {};
    payment.metadata = JSON.stringify({
      ...currentMetadata,
      ...v.raw,
    });
    payment.channel = v.channel;
    if (existingTransaction) return;
    wallet.availableBalance += Number(payment.amount);
    wallet.totalBalance += Number(payment.amount);
    const transactionModel = em.create(Transaction, {
      uuid: v4(),
      type: TransactionType.CREDIT,
      status: TransactionStatus.SUCCESS,
      amount: payment.amount,
      wallet: em.getReference(Wallet, wallet.uuid),
      payment: em.getReference(Payment, payment.uuid),
      remark: `Wallet Fund`,
      locked: false,
    });
    em.persist(transactionModel);
  }

  private async acceptOfferAndCreateJob(
    em: EntityManager,
    payment: Payment,
    v: NormalizedVerification,
  ) {
    const offer = await em.findOne(Offer, {
      uuid: payment.offer?.uuid,
    });
    if (!offer) throw new NotFoundException(`Offer not found`);
    if (Math.round(Number(offer.price) * (1 + PLATFORM_COMMISSION_RATE)) + SERVICE_FEE_FLAT !== Number(payment.amount))
      throw new InternalServerErrorException(`Amount mismatch`);
    const conversation = await em.findOne(Conversation, {
      uuid: payment.conversation?.uuid,
    });
    if (!conversation) throw new NotFoundException(`Conversation not found`);
    offer.status = OfferStatus.PAID;
    conversation.locked = false;
    conversation.lastLockedAt = null;
    conversation.cancellationChances = 3;
    conversation.restricted = false;
    payment.metadata = JSON.stringify({
      ...JSON.parse(payment.metadata),
      ...v.raw,
    });
    payment.channel = v.channel;
    const jobUuid = v4();
    const jobModel = em.create(Job, {
      uuid: jobUuid,
      serviceProvider: em.getReference(
        Users,
        conversation.serviceProvider?.uuid,
      ),
      serviceRequestor: em.getReference(
        Users,
        conversation.serviceRequestor?.uuid,
      ),
      description:
        JSON.parse(payment.metadata)?.description ?? offer.description,
      requestId: `DH${generateOtp(4)}`,
      price: offer.price,
      pictures: offer.pictures,
      code: generateOtp(4),
      payment: em.getReference(Payment, payment.uuid),
      acceptedAt: new Date(),
    });
    const jobTimelineModel = em.create(JobTimeline, {
      uuid: v4(),
      job: em.getReference(Job, jobUuid),
      event: 'Offer Accepted',
      actor: em.getReference(Users, payment.user?.uuid),
    });
    em.persist(jobModel);
    em.persist(jobTimelineModel);
    return {
      uuid: jobModel.uuid,
      conversationUuid: conversation.uuid,
      serviceProviderUuid: conversation.serviceProvider?.uuid,
      serviceRequestorUuid: conversation.serviceRequestor?.uuid,
      price: offer.price,
      status: jobModel.status,
      ...jobModel,
    };
  }
}
