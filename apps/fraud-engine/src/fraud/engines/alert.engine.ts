import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { FraudAlertHistoryEntity } from '../../database/entities/fraud-alert-history.entity';
import { FraudAlertPolicyActionEntity } from '../../database/entities/fraud-alert-policy-action.entity';
import { FraudAlertTriggeredRuleEntity } from '../../database/entities/fraud-alert-triggered-rule.entity';
import { FraudAlertEntity } from '../../database/entities/fraud-alert.entity';
import { FraudFeatures, PolicyAction, TriggeredRule } from '../types/fraud.types';

@Injectable()
export class AlertEngine {
  private readonly activeStatuses = ['OPEN', 'ASSIGNED', 'UNDER_REVIEW'];

  constructor(
    @InjectRepository(FraudAlertEntity, 'fraud')
    private readonly alertRepo: Repository<FraudAlertEntity>,
    @InjectRepository(FraudAlertTriggeredRuleEntity, 'fraud')
    private readonly alertTriggeredRuleRepo: Repository<FraudAlertTriggeredRuleEntity>,
    @InjectRepository(FraudAlertPolicyActionEntity, 'fraud')
    private readonly alertPolicyActionRepo: Repository<FraudAlertPolicyActionEntity>,
    @InjectRepository(FraudAlertHistoryEntity, 'fraud')
    private readonly alertHistoryRepo: Repository<FraudAlertHistoryEntity>,
  ) {}

  async evaluateAndCreateAlert(input: {
    transactionId?: string | null;
    rootIdentifier: { type: string; value: string };
    features: FraudFeatures;
    relatedIdentifiers: unknown;
    graph: unknown;
    triggeredRules: TriggeredRule[];
    riskScore: number;
    riskLevel: string;
    defaultDecision?: string;
    finalDecision: string;
    displayColor?: string;
    policyActions: PolicyAction[];
    reasons: string[];
    source?: 'INGESTION' | 'MANUAL' | 'REPROCESS';
  }): Promise<{ created: boolean; alertId?: string; reason: string }> {
    if (!this.shouldCreateAlert(input)) {
      return { created: false, reason: 'Risk profile does not require alert' };
    }

    const existing = await this.findExistingActiveAlert(
      input.transactionId ?? null,
      input.rootIdentifier.type,
      input.rootIdentifier.value,
    );
    if (existing) {
      return {
        created: false,
        alertId: existing.id,
        reason: 'Active alert already exists',
      };
    }

    const now = new Date();
    const alert = this.alertRepo.create({
      transactionId: input.transactionId ?? undefined,
      rootIdentifierType: input.rootIdentifier.type,
      rootIdentifierValue: input.rootIdentifier.value,
      riskScore: input.riskScore,
      riskLevel: input.riskLevel,
      defaultDecision: input.defaultDecision ?? undefined,
      finalDecision: input.finalDecision,
      displayColor: input.displayColor ?? undefined,
      highestSeverity: this.getHighestSeverity(input.triggeredRules),
      alertStatus: 'OPEN',
      createdAt: now,
      updatedAt: now,
      featuresJson: JSON.stringify(input.features ?? {}),
      relatedIdentifiersJson: JSON.stringify(input.relatedIdentifiers ?? {}),
      graphJson: JSON.stringify(input.graph ?? {}),
      reasonsJson: JSON.stringify(input.reasons ?? []),
      source: input.source ?? 'INGESTION',
    });
    const savedAlert = await this.alertRepo.save(alert);

    if (input.triggeredRules.length > 0) {
      const alertRules = input.triggeredRules.map((rule) =>
        this.alertTriggeredRuleRepo.create({
          alertId: savedAlert.id,
          ruleCode: rule.ruleCode,
          ruleName: rule.ruleName,
          severity: rule.severity,
          scoreImpact: rule.scoreImpact,
          message: rule.message,
          featureName: rule.featureName ?? undefined,
          featureValue:
            typeof rule.featureValue === 'boolean'
              ? rule.featureValue
                ? 1
                : 0
              : rule.featureValue,
          operator: rule.operator ?? undefined,
          thresholdValue: rule.thresholdValue ?? undefined,
          createdAt: now,
        }),
      );
      await this.alertTriggeredRuleRepo.save(alertRules);
    }

    if (input.policyActions.length > 0) {
      const alertPolicies = input.policyActions.map((policyAction) =>
        this.alertPolicyActionRepo.create({
          alertId: savedAlert.id,
          policyCode: policyAction.policyCode,
          policyName: policyAction.policyName,
          decision: policyAction.decision,
          actionLabel: policyAction.actionLabel,
          priority: policyAction.priority,
          createdAt: now,
        }),
      );
      await this.alertPolicyActionRepo.save(alertPolicies);
    }

    await this.alertHistoryRepo.save(
      this.alertHistoryRepo.create({
        alertId: savedAlert.id,
        actionType: 'CREATED',
        newStatus: 'OPEN',
        comment: 'Alert created automatically from fraud evaluation.',
        performedBy: 'system',
        createdAt: now,
      }),
    );

    return { created: true, alertId: savedAlert.id, reason: 'Alert created' };
  }

  private shouldCreateAlert(input: {
    finalDecision: string;
    riskLevel: string;
    triggeredRules: TriggeredRule[];
    policyActions: PolicyAction[];
  }): boolean {
    const finalDecision = input.finalDecision.toUpperCase();
    const alertDecisions = ['MANUAL_REVIEW', 'REVIEW', 'BLOCK', 'HOLD', 'ESCALATE'];
    if (alertDecisions.includes(finalDecision)) {
      return true;
    }

    if (['HIGH', 'CRITICAL'].includes(input.riskLevel.toUpperCase())) {
      return true;
    }

    const hasHighSeverityRule = input.triggeredRules.some((rule) =>
      ['HIGH', 'CRITICAL'].includes(rule.severity.toUpperCase()),
    );
    if (hasHighSeverityRule) {
      return true;
    }

    return input.policyActions.some((policyAction) =>
      alertDecisions.includes(policyAction.decision.toUpperCase()),
    );
  }

  private async findExistingActiveAlert(
    transactionId: string | null,
    rootIdentifierType: string,
    rootIdentifierValue: string,
  ): Promise<FraudAlertEntity | null> {
    const query = this.alertRepo
      .createQueryBuilder('alert')
      .where('alert.alert_status IN (:...statuses)', {
        statuses: this.activeStatuses,
      })
      .andWhere(
        new Brackets((qb) => {
          qb.where(
            '(alert.root_identifier_type = :rootIdentifierType AND alert.root_identifier_value = :rootIdentifierValue)',
            { rootIdentifierType, rootIdentifierValue },
          );
          if (transactionId) {
            qb.orWhere('alert.transaction_id = :transactionId', { transactionId });
          }
        }),
      )
      .orderBy('alert.created_at', 'DESC');

    return query.getOne();
  }

  private getHighestSeverity(triggeredRules: TriggeredRule[]): string | undefined {
    if (triggeredRules.length === 0) {
      return undefined;
    }

    const rank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    const highestRule = triggeredRules.reduce((current, candidate) =>
      rank[candidate.severity] > rank[current.severity] ? candidate : current,
    );
    return highestRule.severity;
  }
}
