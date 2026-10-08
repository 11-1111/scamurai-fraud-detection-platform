import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudRiskLevelEntity } from '../../database/entities/fraud-risk-level.entity';

@Injectable()
export class RiskClassificationEngine {
  constructor(
    @InjectRepository(FraudRiskLevelEntity, 'fraud')
    private readonly riskLevelRepo: Repository<FraudRiskLevelEntity>,
  ) {}

  async classify(score: number): Promise<{
    riskLevel: string;
    defaultDecision: string;
    displayColor?: string;
  }> {
    const riskLevel = await this.riskLevelRepo
      .createQueryBuilder('risk')
      .where('risk.is_enabled = :enabled', { enabled: true })
      .andWhere(':score BETWEEN risk.min_score AND risk.max_score', { score })
      .orderBy('risk.priority', 'DESC')
      .getOne();

    if (riskLevel) {
      return {
        riskLevel: riskLevel.levelCode,
        defaultDecision: riskLevel.defaultDecision,
        displayColor: riskLevel.displayColor ?? undefined,
      };
    }

    if (score >= 86) {
      return {
        riskLevel: 'CRITICAL',
        defaultDecision: 'BLOCK',
        displayColor: 'red',
      };
    }

    if (score >= 61) {
      return {
        riskLevel: 'HIGH',
        defaultDecision: 'MANUAL_REVIEW',
        displayColor: 'orange',
      };
    }

    if (score >= 31) {
      return {
        riskLevel: 'MEDIUM',
        defaultDecision: 'ALLOW_WITH_MONITORING',
        displayColor: 'amber',
      };
    }

    return {
      riskLevel: 'LOW',
      defaultDecision: 'ALLOW',
      displayColor: 'green',
    };
  }
}
