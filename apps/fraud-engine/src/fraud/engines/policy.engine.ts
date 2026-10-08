import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudPolicyRuleEntity } from '../../database/entities/fraud-policy-rule.entity';
import { FraudFeatures, PolicyAction } from '../types/fraud.types';

@Injectable()
export class PolicyEngine {
  constructor(
    @InjectRepository(FraudPolicyRuleEntity, 'fraud')
    private readonly policyRuleRepo: Repository<FraudPolicyRuleEntity>,
  ) {}

  async evaluatePolicy(input: {
    riskScore: number;
    riskLevel: string;
    defaultDecision: string;
    features: FraudFeatures;
  }): Promise<{
    finalDecision: string;
    policyActions: PolicyAction[];
  }> {
    const policies = await this.policyRuleRepo.find({
      where: { isEnabled: true },
      order: { priority: 'DESC' },
    });

    const policyActions: PolicyAction[] = [];

    for (const policy of policies) {
      if (!this.matchesPolicy(policy, input)) {
        continue;
      }

      policyActions.push({
        policyCode: policy.policyCode,
        policyName: policy.policyName,
        decision: policy.decision,
        actionLabel: policy.actionLabel,
        priority: policy.priority,
      });
    }

    return {
      finalDecision: policyActions[0]?.decision ?? input.defaultDecision,
      policyActions,
    };
  }

  private matchesPolicy(
    policy: FraudPolicyRuleEntity,
    input: {
      riskScore: number;
      riskLevel: string;
      features: FraudFeatures;
    },
  ): boolean {
    if (
      policy.minRiskScore !== undefined &&
      input.riskScore < policy.minRiskScore
    ) {
      return false;
    }

    if (
      policy.maxRiskScore !== undefined &&
      input.riskScore > policy.maxRiskScore
    ) {
      return false;
    }

    if (
      policy.riskLevel &&
      policy.riskLevel.trim().toUpperCase() !== input.riskLevel.toUpperCase()
    ) {
      return false;
    }

    if (policy.conditionFeature) {
      const featureValue = Number(input.features[policy.conditionFeature] ?? 0);
      const conditionValue = Number(policy.conditionValue ?? 0);
      if (!this.compare(featureValue, policy.operator, conditionValue)) {
        return false;
      }
    }

    return true;
  }

  private compare(
    featureValue: number,
    operator: string | undefined,
    conditionValue: number,
  ): boolean {
    switch (operator) {
      case '>':
        return featureValue > conditionValue;
      case '>=':
        return featureValue >= conditionValue;
      case '<':
        return featureValue < conditionValue;
      case '<=':
        return featureValue <= conditionValue;
      case '=':
        return featureValue === conditionValue;
      case '!=':
        return featureValue !== conditionValue;
      default:
        return false;
    }
  }
}
