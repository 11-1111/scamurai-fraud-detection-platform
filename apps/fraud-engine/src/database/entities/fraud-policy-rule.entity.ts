import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'fraud_policy_rules' })
export class FraudPolicyRuleEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'policy_code' })
  policyCode: string;

  @Column({ name: 'policy_name' })
  policyName: string;

  @Column({ name: 'description', type: 'nvarchar', nullable: true })
  description?: string;

  @Column({ name: 'condition_feature', type: 'nvarchar', nullable: true })
  conditionFeature?: string;

  @Column({ name: 'operator', type: 'nvarchar', nullable: true })
  operator?: string;

  @Column('decimal', {
    name: 'condition_value',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  conditionValue?: number;

  @Column({ name: 'min_risk_score', type: 'int', nullable: true })
  minRiskScore?: number;

  @Column({ name: 'max_risk_score', type: 'int', nullable: true })
  maxRiskScore?: number;

  @Column({ name: 'risk_level', type: 'nvarchar', nullable: true })
  riskLevel?: string;

  @Column({ name: 'decision' })
  decision: string;

  @Column({ name: 'action_label' })
  actionLabel: string;

  @Column({ name: 'priority', type: 'int', default: 1 })
  priority: number;

  @Column({ name: 'is_enabled', type: 'bit', default: true })
  isEnabled: boolean;

  @Column({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime2', nullable: true })
  updatedAt?: Date;
}
