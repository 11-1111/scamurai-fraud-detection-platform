import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FraudTransactionEntity } from './fraud-transaction.entity';
import { FraudTransactionEvaluationEntity } from './fraud-transaction-evaluation.entity';

export enum FraudFeatureValueType {
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  STRING = 'STRING',
  JSON = 'JSON',
  NULL = 'NULL',
}

@Entity({ name: 'fraud_transaction_features' })
@Index(['evaluationId', 'featureName'], { unique: true })
export class FraudTransactionFeatureEntity {
  // BIGINT identity: stored as string to avoid JS number precision loss.
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column('uniqueidentifier', { name: 'evaluation_id' })
  evaluationId: string;

  @ManyToOne(() => FraudTransactionEvaluationEntity, (evaluation) => evaluation.features, {
    nullable: false,
  })
  @JoinColumn({ name: 'evaluation_id' })
  evaluation: FraudTransactionEvaluationEntity;

  @Column('uniqueidentifier', { name: 'fraud_transaction_id' })
  fraudTransactionId: string;

  @ManyToOne(() => FraudTransactionEntity, { nullable: false })
  @JoinColumn({ name: 'fraud_transaction_id' })
  fraudTransaction: FraudTransactionEntity;

  @Column({ name: 'feature_name', type: 'nvarchar', length: 150 })
  featureName: string;

  @Column({ name: 'feature_label', type: 'nvarchar', length: 200, nullable: true })
  featureLabel?: string;

  @Column({
    name: 'feature_category',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  featureCategory?: string;

  @Column({
    name: 'feature_description',
    type: 'nvarchar',
    length: 1000,
    nullable: true,
  })
  featureDescription?: string;

  @Column({ name: 'value_type', type: 'nvarchar', length: 30 })
  valueType: FraudFeatureValueType;

  @Column('decimal', {
    name: 'numeric_value',
    precision: 38,
    scale: 10,
    nullable: true,
  })
  numericValue?: number;

  @Column({ name: 'boolean_value', type: 'bit', nullable: true })
  booleanValue?: boolean;

  @Column({
    name: 'string_value',
    type: 'nvarchar',
    length: 2000,
    nullable: true,
  })
  stringValue?: string;

  @Column({ name: 'json_value', type: 'nvarchar', length: 'MAX', nullable: true })
  jsonValue?: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  unit?: string;

  @Column({ name: 'window_seconds', type: 'int', nullable: true })
  windowSeconds?: number;

  @Column({ name: 'calculated_at', type: 'datetime2', precision: 3 })
  calculatedAt: Date;

  @Column({ name: 'created_at', type: 'datetime2', precision: 3 })
  createdAt: Date;
}
