import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'fraud_risk_levels' })
export class FraudRiskLevelEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'level_code' })
  levelCode: string;

  @Column({ name: 'min_score', type: 'int' })
  minScore: number;

  @Column({ name: 'max_score', type: 'int' })
  maxScore: number;

  @Column({ name: 'default_decision' })
  defaultDecision: string;

  @Column({ name: 'display_color', type: 'nvarchar', nullable: true })
  displayColor?: string;

  @Column({ name: 'priority', type: 'int' })
  priority: number;

  @Column({ name: 'is_enabled', type: 'bit', default: true })
  isEnabled: boolean;
}
