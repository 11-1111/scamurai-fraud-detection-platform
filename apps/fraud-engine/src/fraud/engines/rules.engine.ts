import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudRuleConfigEntity } from '../../database/entities/fraud-rule-config.entity';
import { FraudFeatures, TriggeredRule } from '../types/fraud.types';
import {
  MetricsService,
  UnevaluableReason,
} from '../../observability/metrics.service';
import { compareFeature, resolveFeature } from './feature-resolution';

@Injectable()
export class RulesEngine {
  private readonly logger = new Logger(RulesEngine.name);

  /*
   * Rules already reported as unevaluable, so a misconfigured rule produces
   * one warning rather than one per transaction. Per-process, so a restart
   * reports again -- which is what you want after a deploy that was supposed
   * to fix it.
   */
  private readonly reportedRules = new Set<string>();

  constructor(
    @InjectRepository(FraudRuleConfigEntity, 'fraud')
    private readonly ruleConfigRepo: Repository<FraudRuleConfigEntity>,

    private readonly metrics: MetricsService,
  ) {}

  async evaluate(features: FraudFeatures): Promise<TriggeredRule[]> {
    const rules = await this.ruleConfigRepo.find({
      where: { isEnabled: true },
      order: { id: 'ASC' },
    });

    const triggeredRules: TriggeredRule[] = [];

    for (const rule of rules) {
      const feature = resolveFeature(features, rule.featureName);

      if (feature.kind === 'absent') {
        /*
         * The rule names a feature that was not calculated: a feature renamed
         * without updating the rule, a calculator that did not run, or a rule
         * seeded directly into SQL. Writes through the config API are checked
         * against the feature catalogue, but the seed scripts bypass that, so
         * the guard has to exist here too.
         */
        this.reportUnevaluable(
          rule,
          'missing_feature',
          `feature "${rule.featureName}" was not calculated`,
        );
        continue;
      }

      if (feature.kind === 'unusable') {
        this.reportUnevaluable(
          rule,
          'unusable_feature',
          `feature "${rule.featureName}" is not a number or a boolean`,
        );
        continue;
      }

      const thresholdValue = Number(rule.thresholdValue);
      if (!Number.isFinite(thresholdValue)) {
        this.reportUnevaluable(
          rule,
          'bad_threshold',
          `threshold ${String(rule.thresholdValue)} is not a number`,
        );
        continue;
      }

      const comparison = compareFeature(feature, rule.operator, thresholdValue);

      if (comparison === null) {
        this.reportUnevaluable(
          rule,
          'bad_operator',
          `operator "${rule.operator}" cannot be applied to a ${feature.kind} feature`,
        );
        continue;
      }

      if (!comparison) {
        continue;
      }

      triggeredRules.push({
        ruleCode: rule.ruleCode,
        ruleName: rule.ruleName,
        severity: this.normalizeSeverity(rule.severity),
        scoreImpact: Number(rule.scoreImpact ?? 0),
        message: `Rule ${rule.ruleCode} triggered because ${rule.featureName} value ${String(feature.value)} ${rule.operator} threshold ${thresholdValue}.`,
        featureName: rule.featureName,
        featureValue: feature.value,
        operator: rule.operator,
        thresholdValue,
      });
    }

    return triggeredRules;
  }

  /*
   * A rule that cannot be evaluated must not fire -- a false positive on
   * every transaction is worse than a rule that is quietly inactive -- but it
   * must not be invisible either, or a rule nobody notices is dead stays dead.
   */
  private reportUnevaluable(
    rule: FraudRuleConfigEntity,
    category: UnevaluableReason,
    reason: string,
  ): void {
    /*
     * The counter is incremented every time, while the log line is emitted
     * once. They answer different questions: the log says what is wrong and
     * is only useful if somebody is reading it, and the counter says it is
     * still happening weeks later -- which is how a rule that has been dead
     * since a deploy gets noticed at all.
     */
    this.metrics.recordUnevaluableRule(rule.ruleCode, category);

    const key = `${rule.ruleCode}:${category}`;
    if (this.reportedRules.has(key)) {
      return;
    }

    this.reportedRules.add(key);
    this.logger.warn(
      `Rule ${rule.ruleCode} ("${rule.ruleName}") is not being evaluated: ${reason}.`,
    );
  }

  private normalizeSeverity(
    severity: string,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const normalized = severity?.toUpperCase();
    if (
      normalized === 'LOW' ||
      normalized === 'MEDIUM' ||
      normalized === 'HIGH' ||
      normalized === 'CRITICAL'
    ) {
      return normalized;
    }

    return 'MEDIUM';
  }
}
