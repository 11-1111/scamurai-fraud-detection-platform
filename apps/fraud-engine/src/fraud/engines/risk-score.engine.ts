import { Injectable } from '@nestjs/common';
import { RiskScoreResult, TriggeredRule } from '../types/fraud.types';
import { RiskClassificationEngine } from './risk-classification.engine';

@Injectable()
export class RiskScoreEngine {
  constructor(
    private readonly riskClassificationEngine: RiskClassificationEngine,
  ) {}

  async calculate(triggeredRules: TriggeredRule[]): Promise<RiskScoreResult> {
    const total = triggeredRules.reduce(
      (sum, rule) => sum + rule.scoreImpact,
      0,
    );
    const riskScore = Math.min(100, total);
    const classification = await this.riskClassificationEngine.classify(riskScore);

    return {
      riskScore,
      riskLevel: classification.riskLevel,
      decision: classification.defaultDecision,
      displayColor: classification.displayColor,
    };
  }
}
