import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'fraud_rules_config' })
export class FraudRuleConfigEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'rule_code' })
  ruleCode: string;

  @Column({ name: 'rule_name' })
  ruleName: string;

  @Column({ name: 'description', type: 'nvarchar', nullable: true })
  description?: string;

  @Column({ name: 'feature_name' })
  featureName: string;

  @Column({ name: 'operator' })
  operator: string;

  @Column('decimal', { name: 'threshold_value', precision: 18, scale: 2 })
  thresholdValue: number;

  @Column({ name: 'severity' })
  severity: string;

  @Column({ name: 'score_impact', type: 'int' })
  scoreImpact: number;

  @Column({ name: 'is_enabled', type: 'bit', default: true })
  isEnabled: boolean;

  @Column({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime2', nullable: true })
  updatedAt?: Date;
}
