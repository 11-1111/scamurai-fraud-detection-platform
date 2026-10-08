import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'fraud_ingestion_config' })
@Index('UX_fraud_ingestion_config_source_name', ['sourceName'], { unique: true })
export class FraudIngestionConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'source_name', type: 'nvarchar', length: 200 })
  sourceName: string;

  @Column({ name: 'is_enabled', type: 'bit', default: true })
  isEnabled: boolean;

  @Column({ name: 'interval_minutes', type: 'int', default: 10 })
  intervalMinutes: number;

  @Column({ name: 'batch_size', type: 'int', default: 500 })
  batchSize: number;

  @Column({ name: 'max_concurrency', type: 'int', default: 1 })
  maxConcurrency: number;

  @Column({ name: 'job_timeout_seconds', type: 'int', default: 600 })
  jobTimeoutSeconds: number;

  @Column({ name: 'retry_attempts', type: 'int', default: 3 })
  retryAttempts: number;

  @Column({ name: 'retry_backoff_seconds', type: 'int', default: 30 })
  retryBackoffSeconds: number;

  @Column({ name: 'updated_at', type: 'datetime2', precision: 3 })
  updatedAt: Date;

  @Column({ name: 'created_at', type: 'datetime2', precision: 3 })
  createdAt: Date;
}
