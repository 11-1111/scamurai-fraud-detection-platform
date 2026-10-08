import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'fraud_alerts' })
export class FraudAlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uniqueidentifier', { name: 'transaction_id', nullable: true })
  transactionId?: string;

  @Column({ name: 'root_identifier_type' })
  rootIdentifierType: string;

  @Column({ name: 'root_identifier_value' })
  rootIdentifierValue: string;

  @Column({ name: 'risk_score', type: 'int' })
  riskScore: number;

  @Column({ name: 'risk_level' })
  riskLevel: string;

  @Column({ name: 'default_decision', type: 'nvarchar', nullable: true })
  defaultDecision?: string;

  @Column({ name: 'final_decision' })
  finalDecision: string;

  @Column({ name: 'display_color', type: 'nvarchar', nullable: true })
  displayColor?: string;

  @Column({ name: 'highest_severity', type: 'nvarchar', nullable: true })
  highestSeverity?: string;

  @Column({ name: 'alert_status' })
  alertStatus: string;

  @Column({ name: 'resolution', type: 'nvarchar', nullable: true })
  resolution?: string;

  @Column({ name: 'assigned_to', type: 'nvarchar', nullable: true })
  assignedTo?: string;

  @Column({ name: 'assigned_at', type: 'datetime2', nullable: true })
  assignedAt?: Date;

  @Column({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime2', nullable: true })
  updatedAt?: Date;

  @Column({ name: 'resolved_at', type: 'datetime2', nullable: true })
  resolvedAt?: Date;

  @Column({ name: 'closed_at', type: 'datetime2', nullable: true })
  closedAt?: Date;

  @Column({ name: 'features_json', type: 'nvarchar', nullable: true })
  featuresJson?: string;

  @Column({ name: 'related_identifiers_json', type: 'nvarchar', nullable: true })
  relatedIdentifiersJson?: string;

  @Column({ name: 'graph_json', type: 'nvarchar', nullable: true })
  graphJson?: string;

  @Column({ name: 'reasons_json', type: 'nvarchar', nullable: true })
  reasonsJson?: string;

  @Column({ name: 'source' })
  source: string;
}
