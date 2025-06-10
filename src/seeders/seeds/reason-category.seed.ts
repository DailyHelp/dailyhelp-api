import { Injectable } from '@nestjs/common';
import { ISeeder } from '../seeder.interface';
import { EntityManager } from '@mikro-orm/core';
import { ReasonCategory } from '../../modules/admin/admin.entities';
import { ReasonCategoryType } from '../../types';
import { v4 } from 'uuid';

@Injectable()
export default class ReasonCategorySeed implements ISeeder {
  constructor(private readonly em: EntityManager) {}

  async run(): Promise<void> {
    const forkedEm = this.em.fork();
    const existing = await forkedEm.findAll(ReasonCategory);
    if (existing.length) return;
    const reasons = [
      { name: 'Location too far', type: ReasonCategoryType.JOB_PROVIDER },
      { name: 'Unavailable', type: ReasonCategoryType.JOB_PROVIDER },
      {
        name: 'Unsafe or inaccessible area',
        type: ReasonCategoryType.JOB_PROVIDER,
      },
      { name: 'Emergency', type: ReasonCategoryType.JOB_PROVIDER },
      { name: 'Felt unsafe', type: ReasonCategoryType.JOB_PROVIDER },
      {
        name: 'Client refused to start JOB_PROVIDER',
        type: ReasonCategoryType.JOB_PROVIDER,
      },
      { name: 'Offer is too low', type: ReasonCategoryType.OFFER_PROVIDER },
      {
        name: 'Job details are unclear',
        type: ReasonCategoryType.OFFER_PROVIDER,
      },
      { name: "Don't offer service", type: ReasonCategoryType.OFFER_PROVIDER },
      { name: 'Incomplete info', type: ReasonCategoryType.OFFER_PROVIDER },
      { name: 'Not my expertise', type: ReasonCategoryType.OFFER_PROVIDER },
      { name: 'Prefer someone else', type: ReasonCategoryType.OFFER_PROVIDER },
      {
        name: 'Job details were false or misleading',
        type: ReasonCategoryType.DISPUTE_PROVIDER,
      },
      {
        name: 'Client changed the agreed job scope',
        type: ReasonCategoryType.DISPUTE_PROVIDER,
      },
      {
        name: 'Client was abusive or disrespectful',
        type: ReasonCategoryType.DISPUTE_PROVIDER,
      },
      {
        name: 'Client asked for unpaid extra work',
        type: ReasonCategoryType.DISPUTE_PROVIDER,
      },
      {
        name: 'Client interfered with service delivery',
        type: ReasonCategoryType.DISPUTE_PROVIDER,
      },
      {
        name: 'Client violated platform rules',
        type: ReasonCategoryType.DISPUTE_PROVIDER,
      },
      {
        name: 'Safety or misconduct issue',
        type: ReasonCategoryType.DISPUTE_PROVIDER,
      },
      {
        name: 'Requested payment outside the app',
        type: ReasonCategoryType.DISPUTE_PROVIDER,
      },
      { name: 'Other', type: ReasonCategoryType.DISPUTE_PROVIDER },
      {
        name: 'Abusive or Inappropriate Language',
        type: ReasonCategoryType.REPORT_PROVIDER,
      },
      {
        name: 'Attempts to Move Outside the Platform',
        type: ReasonCategoryType.REPORT_PROVIDER,
      },
      { name: 'Fraudulent Activity', type: ReasonCategoryType.REPORT_PROVIDER },
      {
        name: 'False Job Information',
        type: ReasonCategoryType.REPORT_PROVIDER,
      },
      {
        name: 'Unreasonable or Excessive Demands',
        type: ReasonCategoryType.REPORT_PROVIDER,
      },
      {
        name: 'Repeated Cancellations',
        type: ReasonCategoryType.REPORT_PROVIDER,
      },
      {
        name: 'Non-Payment or Payment Refusal',
        type: ReasonCategoryType.REPORT_PROVIDER,
      },
      {
        name: 'Harassment or Threats',
        type: ReasonCategoryType.REPORT_PROVIDER,
      },
      {
        name: 'Suspicious or Illegal Requests',
        type: ReasonCategoryType.REPORT_PROVIDER,
      },
      { name: 'Other', type: ReasonCategoryType.REPORT_PROVIDER },
      { name: 'No response', type: ReasonCategoryType.OFFER_CLIENT },
      { name: 'Price concern', type: ReasonCategoryType.OFFER_CLIENT },
      { name: 'No longer needed', type: ReasonCategoryType.OFFER_CLIENT },
      { name: 'Made a mistake', type: ReasonCategoryType.OFFER_CLIENT },
      { name: 'Not available', type: ReasonCategoryType.OFFER_CLIENT },
      { name: 'Found someone else', type: ReasonCategoryType.OFFER_CLIENT },
      {
        name: "Provider didn't complete the work",
        type: ReasonCategoryType.DISPUTE_CLIENT,
      },
      {
        name: 'Service not as agreed',
        type: ReasonCategoryType.DISPUTE_CLIENT,
      },
      {
        name: 'Unprofessional or rude behavior',
        type: ReasonCategoryType.DISPUTE_CLIENT,
      },
      {
        name: "Provider didn't show up",
        type: ReasonCategoryType.DISPUTE_CLIENT,
      },
      {
        name: 'Safety or misconduct issue',
        type: ReasonCategoryType.DISPUTE_CLIENT,
      },
      {
        name: 'Requested payment outside the app',
        type: ReasonCategoryType.DISPUTE_CLIENT,
      },
      { name: 'Other', type: ReasonCategoryType.DISPUTE_CLIENT },
      {
        name: 'Fake identity or impersonation',
        type: ReasonCategoryType.REPORT_CLIENT,
      },
      {
        name: 'Overcharged or changed price',
        type: ReasonCategoryType.REPORT_CLIENT,
      },
      { name: 'Scammed or misled', type: ReasonCategoryType.REPORT_CLIENT },
      {
        name: 'Asked to pay outside the app',
        type: ReasonCategoryType.REPORT_CLIENT,
      },
      {
        name: 'Harassment or inappropriate behavior',
        type: ReasonCategoryType.REPORT_CLIENT,
      },
      {
        name: 'No-show or late arrival',
        type: ReasonCategoryType.REPORT_CLIENT,
      },
      {
        name: 'Offensive language or conduct',
        type: ReasonCategoryType.REPORT_CLIENT,
      },
      {
        name: 'Poor quality of service',
        type: ReasonCategoryType.REPORT_CLIENT,
      },
      {
        name: 'Shared personal contact details',
        type: ReasonCategoryType.REPORT_CLIENT,
      },
      { name: 'Other', type: ReasonCategoryType.REPORT_CLIENT },
    ];
    const entries = reasons.map((r) =>
      forkedEm.create(ReasonCategory, {
        uuid: v4(),
        name: r.name,
        type: r.type,
      }),
    );
    await forkedEm.persistAndFlush(entries);
    console.log('Reason categories seeded');
  }
}
