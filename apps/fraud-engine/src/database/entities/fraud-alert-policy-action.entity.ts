import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'fraud_alert_policy_actions' })
export class FraudAlertPolicyActionEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column('uniqueidentifier', { name: 'alert_id' })
  alertId: string;

  @Column({ name: 'policy_code' })
  policyCode: string;

  @Column({ name: 'policy_name' })
  policyName: string;

  @Column({ name: 'decision' })
  decision: string;

  @Column({ name: 'action_label' })
  actionLabel: string;

  @Column({ name: 'priority', type: 'int' })
  priority: number;

  @Column({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;
}
