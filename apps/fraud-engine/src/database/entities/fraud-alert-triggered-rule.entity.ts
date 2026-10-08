import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'fraud_alert_triggered_rules' })
export class FraudAlertTriggeredRuleEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column('uniqueidentifier', { name: 'alert_id' })
  alertId: string;

  @Column({ name: 'rule_code' })
  ruleCode: string;

  @Column({ name: 'rule_name' })
  ruleName: string;

  @Column({ name: 'severity' })
  severity: string;

  @Column({ name: 'score_impact', type: 'int' })
  scoreImpact: number;

  @Column({ name: 'message', type: 'nvarchar', nullable: true })
  message?: string;

  @Column({ name: 'feature_name', type: 'nvarchar', nullable: true })
  featureName?: string;

  @Column('decimal', {
    name: 'feature_value',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  featureValue?: number;

  @Column({ name: 'operator', type: 'nvarchar', nullable: true })
  operator?: string;

  @Column('decimal', {
    name: 'threshold_value',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  thresholdValue?: number;

  @Column({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;
}
