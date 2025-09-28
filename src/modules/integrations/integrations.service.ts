import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Request, Response } from 'express';
import { PaystackConfiguration } from 'src/config/configuration';
import crypto from 'crypto';
import axios from 'axios';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Conversation, Offer } from '../conversations/conversations.entity';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import {
  OfferStatus,
  PaymentPurpose,
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
    @Inject(PaystackConfiguration.KEY)
    private readonly paystackConfig: ConfigType<typeof PaystackConfiguration>,
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
    const hash = crypto
      .createHmac('sha512', this.paystackConfig.secretKey)
      .update(JSON.stringify(req.body))
      .digest('hex');
    if (hash !== req.headers['x-paystack-signature'])
      return res.status(400).send('Invalid signature');
    const event = req.body?.event;
    const data = req.body?.data;
    console.log("here", req.body);
    switch (event) {
      case 'charge.success':
        const verified = await this.verifyWithPaystack(data.reference);
        if (!verified.success) return res.status(200).send('Not successful');
        await this.processPaystackPayment(verified.data);
        return res.status(200).send('OK');
      case 'transfer.success':
      case 'transfer.failed':
      case 'transfer.reversed':
        await this.processPaystackTransfer(data);
        return res.status(200).send('OK');
    }
  }

  async processPaystackTransfer(data: any) {
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
        wallet.totalBalance -= Number(data.amount) / 100;
        break;
      case 'failed':
      case 'reversed':
        transaction.status = TransactionStatus.FAILED;
        wallet.availableBalance += Number(data.amount) / 100;
        break;
    }
    await this.em.flush();
  }

  async verifyWithPaystack(reference: string) {
    const response = await axios.get(
      `${this.paystackConfig.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${this.paystackConfig.secretKey}` } },
    );
    const data = response.data.data;
    const ok = data?.status?.toLowerCase() === 'success';
    return { success: ok, data };
  }

  async processPaystackPayment(data: any) {
    const payment = await this.paymentRepository.findOne(
      { reference: data.reference },
      { lockMode: 1 },
    );
    if (!payment) return;
    if (payment.status === 'success' || payment.status === 'processing') return;
    const paidAmount = Number(data.amount) / 100;
    if (paidAmount !== Number(payment.amount)) {
      payment.status = 'failed';
      await this.em.flush();
      return;
    }
    payment.status = 'processing';
    payment.transactionId = String(data.id);
    await this.em.flush();
    const purpose: PaymentPurpose =
      payment.metadata && JSON.parse(payment.metadata).purpose;
    if (purpose === PaymentPurpose.FUND_WALLET) {
      await this.creditWallet(payment, data);
    } else if (purpose === PaymentPurpose.JOB_OFFER) {
      await this.acceptOfferAndCreateJob(payment, data);
    } else {
      payment.status = 'failed';
      await this.em.flush();
      return;
    }
    payment.status = 'success';
    payment.processedAt = new Date();
    await this.em.flush();
  }

  private async creditWallet(payment: Payment, data: any) {
    const wallet = await this.walletRepository.findOne({
      user: { uuid: payment.user?.uuid },
      userType: payment.userType,
    });
    if (!wallet) throw new NotFoundException(`Wallet not found`);
    wallet.availableBalance += Number(payment.amount);
    wallet.totalBalance += Number(payment.amount);
    payment.metadata = JSON.stringify({
      ...JSON.parse(payment.metadata),
      ...data,
    });
    payment.channel = data.channel ?? data.payment_method;
    const transactionModel = this.transactionRepository.create({
      uuid: v4(),
      type: TransactionType.CREDIT,
      amount: payment.amount,
      wallet: this.walletRepository.getReference(wallet.uuid),
      payment: this.paymentRepository.getReference(payment.uuid),
      remark: `Wallet Fund`,
      locked: false,
    });
    this.em.persist(transactionModel);
  }

  private async acceptOfferAndCreateJob(payment: Payment, data: any) {
    const offer = await this.offerRepository.findOne({
      uuid: payment.offer?.uuid,
    });
    if (!offer) throw new NotFoundException(`Offer not found`);
    if (offer.price !== payment.amount)
      throw new InternalServerErrorException(`Amount mismatch`);
    const conversation = await this.conversationRepository.findOne({
      uuid: payment.conversation?.uuid,
    });
    if (!conversation) throw new NotFoundException(`Conversation not found`);
    offer.status = OfferStatus.ACCEPTED;
    conversation.locked = false;
    conversation.lastLockedAt = null;
    conversation.cancellationChances = 3;
    conversation.restricted = false;
    payment.metadata = JSON.stringify({
      ...JSON.parse(payment.metadata),
      ...data,
    });
    payment.channel = data.channel ?? data.payment_method;
    const jobUuid = v4();
    const jobModel = this.jobRepository.create({
      uuid: jobUuid,
      serviceProvider: this.usersRepository.getReference(
        conversation.serviceProvider?.uuid,
      ),
      serviceRequestor: this.usersRepository.getReference(
        conversation.serviceRequestor?.uuid,
      ),
      description:
        JSON.parse(payment.metadata)?.description ?? offer.description,
      requestId: `DH${generateOtp(4)}`,
      price: offer.price,
      pictures: offer.pictures,
      code: generateOtp(4),
      payment: this.paymentRepository.getReference(payment.uuid),
      acceptedAt: new Date(),
    });
    const jobTimelineModel = this.jobTimelineRepository.create({
      uuid: v4(),
      job: this.jobRepository.getReference(jobUuid),
      event: 'Offer Accepted',
      actor: this.usersRepository.getReference(payment.user?.uuid),
    });
    this.em.persist(jobModel);
    this.em.persist(jobTimelineModel);
    this.ws.jobCreated({
      uuid: jobModel.uuid,
      conversationUuid: conversation.uuid,
      serviceProviderUuid: conversation.serviceProvider?.uuid,
      serviceRequestorUuid: conversation.serviceRequestor?.uuid,
      price: offer.price,
      status: jobModel.status,
      ...jobModel
    });
  }
}
