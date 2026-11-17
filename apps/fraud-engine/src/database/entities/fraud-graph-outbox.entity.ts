import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum FraudGraphOutboxStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  FAILED = 'FAILED',
}

/*
 * A graph write that FraudDb has committed to and Neo4j has not yet applied.
 *
 * Inserted in the same transaction as the rows it refers to, so the commit
 * that makes a transaction visible is the same commit that records the debt
 * to the graph. There is no DONE status: an applied row is deleted, because
 * this is a queue rather than an audit log.
 */
@Entity({ name: 'fraud_graph_outbox' })
export class FraudGraphOutboxEntity {
  // BIGINT identity: stored as string to avoid JS number precision loss.
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column('uniqueidentifier', { name: 'transaction_id' })
  transactionId: string;

  @Column({ type: 'nvarchar', length: 20 })
  status: FraudGraphOutboxStatus;

  @Column({ type: 'int' })
  attempts: number;

  @Column({
    name: 'last_error',
    type: 'nvarchar',
    length: 2000,
    nullable: true,
  })
  lastError?: string;

  /** When this row becomes eligible again. Backoff is expressed here. */
  @Column({ name: 'available_at', type: 'datetime2', precision: 3 })
  availableAt: Date;

  @Column({ name: 'created_at', type: 'datetime2', precision: 3 })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'datetime2',
    precision: 3,
    nullable: true,
  })
  updatedAt?: Date;
}
