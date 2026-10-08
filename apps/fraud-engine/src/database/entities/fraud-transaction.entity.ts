import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'fraud_transactions' })
export class FraudTransactionEntity {
  @PrimaryColumn('uniqueidentifier')
  id: string;

  @Column({ name: 'transaction_date', type: 'datetime2' })
  transactionDate: Date;

  @Column('decimal', { name: 'amount_value', precision: 18, scale: 2 })
  amountValue: number;

  @Column({ name: 'currency_code' })
  currencyCode: string;

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod?: string;

  @Column({ name: 'merchant_name' })
  merchantName: string;

  @Column({ name: 'merchant_email', nullable: true })
  merchantEmail?: string;

  @Column({ name: 'customer_name', nullable: true })
  customerName?: string;

  @Column({ name: 'customer_email', nullable: true })
  customerEmail?: string;

  @Column({ name: 'customer_phone', nullable: true })
  customerPhone?: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'payment_account', nullable: true })
  paymentAccount?: string;

  @Column({ name: 'confirmation_code', nullable: true })
  confirmationCode?: string;

  @Column({ name: 'merchant_ref', nullable: true })
  merchantRef?: string;

  @Column({ name: 'order_tracking_id', nullable: true })
  orderTrackingId?: string;

  @Column({ name: 'bank_auth_code', nullable: true })
  bankAuthCode?: string;

  @Column({ name: 'device_fingerprint', nullable: true })
  deviceFingerprint?: string;

  @Column({ name: 'status_text' })
  statusText: string;

  @Column({ name: 'status_type' })
  statusType: string;

  @Column({ name: 'source_created_at', type: 'datetime2' })
  sourceCreatedAt: Date;

  @Column({ name: 'ingested_at', type: 'datetime2' })
  ingestedAt: Date;
}
