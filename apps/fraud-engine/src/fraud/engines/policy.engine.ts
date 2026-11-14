import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudPolicyRuleEntity } from '../../database/entities/fraud-policy-rule.entity';
import { FraudFeatures, PolicyAction } from '../types/fraud.types';
import {
  compareFeature,
  resolveBound,
  resolveFeature,
} from './feature-resolution';

@Injectable()
export class PolicyEngine {
  private readonly logger = new Logger(PolicyEngine.name);

  private readonly reportedPolicies = new Set<string>();

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
    /*
     * min_risk_score and max_risk_score are nullable, and null means
     * unbounded. The previous guards tested `!== undefined`, but TypeORM
     * returns null for a nullable column, so null went straight to the
     * comparison -- where `riskScore > null` coerces to `riskScore > 0`. A
     * policy with no upper bound therefore matched nothing scoring above
     * zero, which is the exact opposite of unbounded, and the policy sat
     * there looking configured and doing nothing.
     *
     * It only stayed hidden because every seeded policy sets both bounds.
     */
    const minRiskScore = resolveBound(policy.minRiskScore);
    if (minRiskScore.kind === 'unusable') {
      this.reportUnevaluable(
        policy,
        `min_risk_score ${String(policy.minRiskScore)} is not a number`,
      );
      return false;
    }
    if (minRiskScore.kind === 'bound' && input.riskScore < minRiskScore.value) {
      return false;
    }

    const maxRiskScore = resolveBound(policy.maxRiskScore);
    if (maxRiskScore.kind === 'unusable') {
      this.reportUnevaluable(
        policy,
        `max_risk_score ${String(policy.maxRiskScore)} is not a number`,
      );
      return false;
    }
    if (maxRiskScore.kind === 'bound' && input.riskScore > maxRiskScore.value) {
      return false;
    }

    if (
      policy.riskLevel &&
      policy.riskLevel.trim().toUpperCase() !== input.riskLevel.toUpperCase()
    ) {
      return false;
    }

    if (policy.conditionFeature) {
      return this.matchesCondition(policy, input.features);
    }

    return true;
  }

  private matchesCondition(
    policy: FraudPolicyRuleEntity,
    features: FraudFeatures,
  ): boolean {
    const conditionFeature = policy.conditionFeature as string;
    const feature = resolveFeature(features, conditionFeature);

    /*
     * Same defect the rules engine carried: `Number(value ?? 0)` turned a
     * feature that was never calculated into zero, so a policy conditioned
     * on `< n` applied to every transaction. A policy whose condition cannot
     * be evaluated must not apply -- the decision then falls back to the risk
     * level's default, which is the conservative outcome.
     */
    if (feature.kind === 'absent') {
      this.reportUnevaluable(
        policy,
        `feature "${conditionFeature}" was not calculated`,
      );
      return false;
    }

    if (feature.kind === 'unusable') {
      this.reportUnevaluable(
        policy,
        `feature "${conditionFeature}" is not a number or a boolean`,
      );
      return false;
    }

    const conditionValue = Number(policy.conditionValue);
    if (!Number.isFinite(conditionValue)) {
      this.reportUnevaluable(
        policy,
        `condition_value ${String(policy.conditionValue)} is not a number`,
      );
      return false;
    }

    const comparison = compareFeature(feature, policy.operator, conditionValue);

    if (comparison === null) {
      this.reportUnevaluable(
        policy,
        `operator "${String(policy.operator)}" cannot be applied to a ${feature.kind} feature`,
      );
      return false;
    }

    return comparison;
  }

  /*
   * Once per distinct problem per process. A policy misconfiguration repeated
   * on every transaction would bury the log it belongs in, and a restart
   * reporting again is what you want after a deploy meant to fix it.
   */
  private reportUnevaluable(
    policy: FraudPolicyRuleEntity,
    reason: string,
  ): void {
    const key = `${policy.policyCode}:${reason}`;
    if (this.reportedPolicies.has(key)) {
      return;
    }

    this.reportedPolicies.add(key);
    this.logger.warn(
      `Policy ${policy.policyCode} ("${policy.policyName}") is not being applied: ${reason}.`,
    );
  }
}
