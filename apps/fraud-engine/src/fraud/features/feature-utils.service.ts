import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudTransactionEntity } from '../../database/entities/fraud-transaction.entity';

export type AllowedTransactionField =
  | 'paymentAccount'
  | 'customerEmail'
  | 'customerPhone'
  | 'deviceFingerprint'
  | 'ipAddress'
  | 'merchantEmail'
  | 'merchantName'
  | 'merchantRef'
  | 'orderTrackingId';

type MappedTransactionField =
  | AllowedTransactionField
  | 'transactionDate'
  | 'amountValue'
  | 'statusText'
  | 'statusType';

const FIELD_MAP: Record<MappedTransactionField, string> = {
  paymentAccount: 'payment_account',
  customerEmail: 'customer_email',
  customerPhone: 'customer_phone',
  deviceFingerprint: 'device_fingerprint',
  ipAddress: 'ip_address',
  merchantEmail: 'merchant_email',
  merchantName: 'merchant_name',
  merchantRef: 'merchant_ref',
  orderTrackingId: 'order_tracking_id',
  transactionDate: 'transaction_date',
  amountValue: 'amount_value',
  statusText: 'status_text',
  statusType: 'status_type',
};

/**
 * Shared helpers for feature calculators.
 * All database access goes through TypeORM QueryBuilder with parameterized
 * values; column names are resolved only through the FIELD_MAP whitelist.
 */
@Injectable()
export class FeatureUtilsService {
  constructor(
    @InjectRepository(FraudTransactionEntity, 'fraud')
    private readonly fraudTransactionRepo: Repository<FraudTransactionEntity>,
  ) {}

  minutesAgo(referenceDate: Date, minutes: number): Date {
    return new Date(referenceDate.getTime() - minutes * 60 * 1000);
  }

  hoursAgo(referenceDate: Date, hours: number): Date {
    return new Date(referenceDate.getTime() - hours * 60 * 60 * 1000);
  }

  daysAgo(referenceDate: Date, days: number): Date {
    return new Date(referenceDate.getTime() - days * 24 * 60 * 60 * 1000);
  }

  startOfDay(referenceDate: Date): Date {
    const date = new Date(referenceDate);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  safeDivide(numerator: number, denominator: number): number {
    if (!denominator) {
      return 0;
    }
    return numerator / denominator;
  }

  roundRatio(value: number): number {
    return Math.round(value * 100) / 100;
  }

  normalizeDate(date?: Date): Date {
    return date instanceof Date ? date : new Date();
  }

  getCurrentValue(primary?: string, fallback?: string): string | null {
    const first = primary?.trim();
    if (first) {
      return first;
    }

    const second = fallback?.trim();
    return second || null;
  }

  isFailedStatus(statusText?: string, statusType?: string): boolean {
    const text = (statusText ?? '').toLowerCase();
    const type = (statusType ?? '').toLowerCase();
    return (
      text.includes('failed') ||
      text.includes('failure') ||
      text.includes('declined') ||
      text.includes('rejected') ||
      text.includes('error') ||
      type.includes('danger') ||
      type.includes('failed') ||
      type.includes('error')
    );
  }

  isSuccessfulStatus(statusText?: string, statusType?: string): boolean {
    const text = (statusText ?? '').toLowerCase();
    const type = (statusType ?? '').toLowerCase();
    return (
      text.includes('completed') ||
      text.includes('success') ||
      text.includes('successful') ||
      text.includes('approved') ||
      type.includes('success') ||
      type.includes('completed') ||
      type.includes('approved')
    );
  }

  async countFailedTransactionsByField(
    field: AllowedTransactionField,
    value: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<number> {
    const column = this.resolveColumn(field);
    const rows = await this.fraudTransactionRepo
      .createQueryBuilder('tx')
      .select(['tx.status_text AS statusText', 'tx.status_type AS statusType'])
      .where(`tx.${column} = :value`, { value })
      .andWhere('tx.transaction_date >= :fromDate', { fromDate })
      .andWhere('tx.transaction_date <= :toDate', { toDate })
      .getRawMany<{ statusText?: string; statusType?: string }>();

    return rows.filter((row) =>
      this.isFailedStatus(row.statusText, row.statusType),
    ).length;
  }

  /*
    Amount baseline helpers.
    For board demo, all statuses are included in amount baselines.
    This can be changed to successful-only later.
  */

  async getTotalAmountForFieldBetween(
    field: AllowedTransactionField,
    value: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<number> {
    const column = this.resolveColumn(field);
    const raw = await this.fraudTransactionRepo
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.amount_value), 0)', 'total')
      .where(`tx.${column} = :value`, { value })
      .andWhere('tx.transaction_date >= :fromDate', { fromDate })
      .andWhere('tx.transaction_date <= :toDate', { toDate })
      .getRawOne<{ total: string | number }>();

    return Number(raw?.total ?? 0);
  }

  async getAverageAmountForFieldLastDays(
    field: AllowedTransactionField,
    value: string,
    referenceDate: Date,
    days: number,
    excludeTransactionId?: string,
  ): Promise<number> {
    const column = this.resolveColumn(field);
    const fromDate = this.daysAgo(referenceDate, days);
    const qb = this.fraudTransactionRepo
      .createQueryBuilder('tx')
      .select('COALESCE(AVG(tx.amount_value), 0)', 'avgAmount')
      .where(`tx.${column} = :value`, { value })
      .andWhere('tx.transaction_date >= :fromDate', { fromDate })
      .andWhere('tx.transaction_date <= :toDate', { toDate: referenceDate });

    if (excludeTransactionId) {
      qb.andWhere('tx.id <> :excludeTransactionId', { excludeTransactionId });
    }

    const raw = await qb.getRawOne<{ avgAmount: string | number }>();
    return Number(raw?.avgAmount ?? 0);
  }

  async getAverageDailyAmountForFieldPreviousDays(
    field: AllowedTransactionField,
    value: string,
    referenceDate: Date,
    days: number,
  ): Promise<number> {
    const column = this.resolveColumn(field);
    // Previous N days end at the start of the reference day, so "today" is excluded.
    const previousEndDate = this.startOfDay(referenceDate);
    const previousStartDate = this.daysAgo(previousEndDate, days);

    const rows = await this.fraudTransactionRepo
      .createQueryBuilder('tx')
      .select([
        'tx.transaction_date AS transactionDate',
        'tx.amount_value AS amountValue',
      ])
      .where(`tx.${column} = :value`, { value })
      .andWhere('tx.transaction_date >= :fromDate', { fromDate: previousStartDate })
      .andWhere('tx.transaction_date < :toDate', { toDate: previousEndDate })
      .getRawMany<{ transactionDate: Date | string; amountValue: string | number }>();

    if (rows.length === 0) {
      return 0;
    }

    // Group in TypeScript by YYYY-MM-DD to avoid dialect-specific date grouping SQL.
    const dailyTotals = new Map<string, number>();
    for (const row of rows) {
      const date = new Date(row.transactionDate);
      const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      dailyTotals.set(
        dayKey,
        (dailyTotals.get(dayKey) ?? 0) + Number(row.amountValue ?? 0),
      );
    }

    // Average is taken over days that had activity, not over the full window.
    // Days with no transactions are not counted as zero for now; this keeps the
    // baseline conservative and can be revisited if business logic requires it.
    let total = 0;
    for (const dayTotal of dailyTotals.values()) {
      total += dayTotal;
    }
    return this.safeDivide(total, dailyTotals.size);
  }

  async distinctCountByFieldWhere(
    filterField: AllowedTransactionField,
    filterValue: string,
    distinctField: AllowedTransactionField,
    fromDate: Date,
    toDate: Date,
  ): Promise<number> {
    const filterColumn = this.resolveColumn(filterField);
    const distinctColumn = this.resolveColumn(distinctField);
    const raw = await this.fraudTransactionRepo
      .createQueryBuilder('tx')
      .select(`COUNT(DISTINCT tx.${distinctColumn})`, 'count')
      .where(`tx.${filterColumn} = :filterValue`, { filterValue })
      .andWhere('tx.transaction_date >= :fromDate', { fromDate })
      .andWhere('tx.transaction_date <= :toDate', { toDate })
      .andWhere(`tx.${distinctColumn} IS NOT NULL`)
      .andWhere(`LTRIM(RTRIM(tx.${distinctColumn})) <> ''`)
      .getRawOne<{ count: string | number }>();

    return Number(raw?.count ?? 0);
  }

  async successfulTransactionExists(
    orderTrackingId: string,
    excludeTransactionId?: string,
  ): Promise<boolean> {
    // Historical check across all time: an order tracking id should only ever
    // have one successful transaction, so no window filter is applied.
    const qb = this.fraudTransactionRepo
      .createQueryBuilder('tx')
      .select([
        'tx.status_text AS statusText',
        'tx.status_type AS statusType',
      ])
      .where('tx.order_tracking_id = :orderTrackingId', { orderTrackingId });

    if (excludeTransactionId) {
      qb.andWhere('tx.id <> :excludeTransactionId', { excludeTransactionId });
    }

    const rows = await qb.getRawMany<{
      statusText?: string;
      statusType?: string;
    }>();

    return rows.some((row) =>
      this.isSuccessfulStatus(row.statusText, row.statusType),
    );
  }

  private resolveColumn(field: MappedTransactionField): string {
    const column = FIELD_MAP[field];
    if (!column) {
      throw new Error(`Unsupported field name "${field}"`);
    }
    return column;
  }
}
