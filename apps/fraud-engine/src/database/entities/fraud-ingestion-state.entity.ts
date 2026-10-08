import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'fraud_ingestion_state' })
export class FraudIngestionStateEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'source_name' })
  sourceName: string;

  @Column({ name: 'last_synced_at', type: 'datetime2', nullable: true })
  lastSyncedAt: Date | null;

  @Column('uniqueidentifier', {
    name: 'last_synced_transaction_id',
    nullable: true,
  })
  lastSyncedTransactionId: string | null;

  @Column({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;
}
