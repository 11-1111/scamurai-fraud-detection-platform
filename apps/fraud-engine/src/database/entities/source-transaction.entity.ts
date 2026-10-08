import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'Transactions' })
export class SourceTransactionEntity {
  @PrimaryColumn('uniqueidentifier', { name: 'Id' })
  id: string;

  @Column({ name: 'TransactionDate', type: 'datetime2' })
  transactionDate: Date;

  @Column('decimal', { name: 'AmountValue', precision: 18, scale: 2 })
  amountValue: number;

  @Column({ name: 'CurrencyCode' })
  currencyCode: string;

  @Column({ name: 'PaymentMethod', nullable: true })
  paymentMethod?: string;

  @Column({ name: 'MerchantName' })
  merchantName: string;

  @Column({ name: 'MerchantEmail', nullable: true })
  merchantEmail?: string;

  @Column({ name: 'CustomerName', nullable: true })
  customerName?: string;

  @Column({ name: 'CustomerEmail', nullable: true })
  customerEmail?: string;

  @Column({ name: 'IpAddress', nullable: true })
  ipAddress?: string;

  @Column({ name: 'Phone', nullable: true })
  phone?: string;

  @Column({ name: 'PaymentAccount', nullable: true })
  paymentAccount?: string;

  @Column({ name: 'ConfirmationCode', nullable: true })
  confirmationCode?: string;

  @Column({ name: 'MerchantRef', nullable: true })
  merchantRef?: string;

  @Column({ name: 'OrderTrackingId', nullable: true })
  orderTrackingId?: string;

  @Column({ name: 'BankAuthCode', nullable: true })
  bankAuthCode?: string;

  @Column({ name: 'DeviceFingerprint', nullable: true })
  deviceFingerprint?: string;

  @Column({ name: 'StatusText' })
  statusText: string;

  @Column({ name: 'StatusType' })
  statusType: string;

  @Column({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;
}
