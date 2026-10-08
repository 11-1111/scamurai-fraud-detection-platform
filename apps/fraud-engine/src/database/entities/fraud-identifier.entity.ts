import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'fraud_identifiers' })
export class FraudIdentifierEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column('uniqueidentifier', { name: 'transaction_id' })
  transactionId: string;

  @Column({ name: 'identifier_type' })
  identifierType: string;

  @Column({ name: 'identifier_value' })
  identifierValue: string;

  @Column({ name: 'transaction_date', type: 'datetime2' })
  transactionDate: Date;

  @Column({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;
}
