import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'fraud_alert_history' })
export class FraudAlertHistoryEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column('uniqueidentifier', { name: 'alert_id' })
  alertId: string;

  @Column({ name: 'action_type' })
  actionType: string;

  @Column({ name: 'previous_status', type: 'nvarchar', nullable: true })
  previousStatus?: string;

  @Column({ name: 'new_status', type: 'nvarchar', nullable: true })
  newStatus?: string;

  @Column({ name: 'previous_assignee', type: 'nvarchar', nullable: true })
  previousAssignee?: string;

  @Column({ name: 'new_assignee', type: 'nvarchar', nullable: true })
  newAssignee?: string;

  @Column({ name: 'resolution', type: 'nvarchar', nullable: true })
  resolution?: string;

  @Column({ name: 'comment', type: 'nvarchar', nullable: true })
  comment?: string;

  @Column({ name: 'performed_by', type: 'nvarchar', nullable: true })
  performedBy?: string;

  @Column({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;
}
