import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FraudTransactionEntity } from './fraud-transaction.entity';
import { FraudTransactionFeatureEntity } from './fraud-transaction-feature.entity';

export enum FraudEvaluationReason {
  INGESTION = 'INGESTION',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  RULE_CHANGE = 'RULE_CHANGE',
  FEATURE_CHANGE = 'FEATURE_CHANGE',
  BACKFILL = 'BACKFILL',
  SYSTEM_RETRY = 'SYSTEM_RETRY',
}

export enum FraudEvaluationStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity({ name: 'fraud_transaction_evaluations' })
@Index(['fraudTransactionId', 'evaluationVersion'], { unique: true })
export class FraudTransactionEvaluationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uniqueidentifier', { name: 'fraud_transaction_id' })
  fraudTransactionId: string;

  @ManyToOne(() => FraudTransactionEntity, { nullable: false })
  @JoinColumn({ name: 'fraud_transaction_id' })
  fraudTransaction: FraudTransactionEntity;

  @Column({ name: 'evaluation_version', type: 'int' })
  evaluationVersion: number;

  @Column({ name: 'evaluation_reason', type: 'nvarchar', length: 50 })
  evaluationReason: FraudEvaluationReason;

  @Column({ type: 'nvarchar', length: 30 })
  status: FraudEvaluationStatus;

  @Column('decimal', {
    name: 'risk_score',
    precision: 10,
    scale: 4,
    nullable: true,
  })
  riskScore?: number;

  @Column({ name: 'risk_level', type: 'nvarchar', length: 50, nullable: true })
  riskLevel?: string;

  @Column({
    name: 'policy_decision',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  policyDecision?: string;

  @Column({
    name: 'feature_engine_version',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  featureEngineVersion?: string;

  @Column({
    name: 'rules_engine_version',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  rulesEngineVersion?: string;

  @Column({ name: 'started_at', type: 'datetime2', precision: 3 })
  startedAt: Date;

  @Column({
    name: 'completed_at',
    type: 'datetime2',
    precision: 3,
    nullable: true,
  })
  completedAt?: Date;

  @Column({ name: 'created_at', type: 'datetime2', precision: 3 })
  createdAt: Date;

  @OneToMany(
    () => FraudTransactionFeatureEntity,
    (feature) => feature.evaluation,
  )
  features: FraudTransactionFeatureEntity[];
}
