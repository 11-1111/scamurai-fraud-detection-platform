import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudIdentifierEntity } from '../../database/entities/fraud-identifier.entity';
import {
  RelatedIdentifier,
  RelatedIdentifiers,
} from '../types/fraud.types';

type RelationshipGroupKey =
  | 'emails'
  | 'phones'
  | 'ips'
  | 'paymentAccounts'
  | 'fingerprints'
  | 'merchants'
  | 'confirmationCodes'
  | 'orderTrackingIds'
  | 'bankAuthCodes';

@Injectable()
export class RelationshipEngine {
  constructor(
    @InjectRepository(FraudIdentifierEntity, 'fraud')
    private readonly identifierRepo: Repository<FraudIdentifierEntity>,
  ) {}

  async getRelatedIdentifiers(
    type: string,
    value: string,
  ): Promise<RelatedIdentifiers> {
    const normalizedType = type.trim().toLowerCase();
    const normalizedValue = value.trim();
    const related = this.emptyGroups();

    const rows = await this.identifierRepo
      .createQueryBuilder('fi1')
      .innerJoin(
        FraudIdentifierEntity,
        'fi2',
        'fi1.transaction_id = fi2.transaction_id',
      )
      .select('fi2.identifier_type', 'identifierType')
      .addSelect('fi2.identifier_value', 'identifierValue')
      .addSelect('COUNT(*)', 'count')
      .where('fi1.identifier_type = :type', { type: normalizedType })
      .andWhere('fi1.identifier_value = :value', { value: normalizedValue })
      .andWhere('fi2.identifier_value IS NOT NULL')
      .andWhere("LTRIM(RTRIM(fi2.identifier_value)) <> ''")
      .groupBy('fi2.identifier_type')
      .addGroupBy('fi2.identifier_value')
      .orderBy('count', 'DESC')
      .getRawMany<{
        identifierType: string;
        identifierValue: string;
        count: string;
      }>();

    for (const row of rows) {
      const identifierType = row.identifierType?.trim().toLowerCase();
      const identifierValue = row.identifierValue?.trim();

      if (!identifierType || !identifierValue) {
        continue;
      }

      if (
        identifierType === normalizedType &&
        identifierValue === normalizedValue
      ) {
        continue;
      }

      const targetGroup = this.mapIdentifierTypeToGroup(identifierType);
      if (!targetGroup) {
        continue;
      }

      related[targetGroup].push({
        value: identifierValue,
        count: Number(row.count ?? 0),
      });
    }

    this.sortGroupsByCount(related);
    return related;
  }

  private emptyGroups(): RelatedIdentifiers {
    return {
      emails: [],
      phones: [],
      ips: [],
      paymentAccounts: [],
      fingerprints: [],
      merchants: [],
      confirmationCodes: [],
      orderTrackingIds: [],
      bankAuthCodes: [],
    };
  }

  private mapIdentifierTypeToGroup(
    type: string,
  ): RelationshipGroupKey | undefined {
    switch (type) {
      case 'email':
        return 'emails';
      case 'phone':
        return 'phones';
      case 'ip':
        return 'ips';
      case 'payment_account':
        return 'paymentAccounts';
      case 'fingerprint':
        return 'fingerprints';
      case 'merchant_email':
      case 'merchant_name':
        return 'merchants';
      case 'confirmation_code':
        return 'confirmationCodes';
      case 'order_tracking_id':
        return 'orderTrackingIds';
      case 'bank_auth_code':
        return 'bankAuthCodes';
      default:
        return undefined;
    }
  }

  private sortGroupsByCount(related: RelatedIdentifiers): void {
    const groups: RelatedIdentifier[][] = [
      related.emails,
      related.phones,
      related.ips,
      related.paymentAccounts,
      related.fingerprints,
      related.merchants,
      related.confirmationCodes,
      related.orderTrackingIds,
      related.bankAuthCodes,
    ];

    for (const group of groups) {
      group.sort((a, b) => b.count - a.count);
    }
  }
}
