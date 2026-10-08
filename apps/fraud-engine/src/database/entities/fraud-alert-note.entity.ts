import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'fraud_alert_notes' })
export class FraudAlertNoteEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column('uniqueidentifier', { name: 'alert_id' })
  alertId: string;

  @Column({ name: 'note', type: 'nvarchar' })
  note: string;

  @Column({ name: 'created_by', type: 'nvarchar', nullable: true })
  createdBy?: string;

  @Column({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;
}
