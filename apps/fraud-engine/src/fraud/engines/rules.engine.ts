import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudRuleConfigEntity } from '../../database/entities/fraud-rule-config.entity';
import {
  FraudFeatureValue,
  FraudFeatures,
  TriggeredRule,
} from '../types/fraud.types';

/*
 * A feature value a rule can actually be compared against, or the reason it
 * cannot be.
 *
 * "absent" and "unusable" are deliberately not the same as a value of zero.
 * Treating them as zero is what made a rule whose feature had not been
 * calculated fire on every transaction it saw.
 */
type ResolvedFeature =
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; value: number }
  | { kind: 'absent' }
  | { kind: 'unusable' };

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
  ) {}

  async evaluate(features: FraudFeatures): Promise<TriggeredRule[]> {
    const rules = await this.ruleConfigRepo.find({
      where: { isEnabled: true },
      order: { id: 'ASC' },
    });

    const triggeredRules: TriggeredRule[] = [];

    for (const rule of rules) {
      const feature = this.resolveFeature(features, rule.featureName);

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
          `feature "${rule.featureName}" was not calculated`,
        );
        continue;
      }

      if (feature.kind === 'unusable') {
        this.reportUnevaluable(
          rule,
          `feature "${rule.featureName}" is not a number or a boolean`,
        );
        continue;
      }

      const thresholdValue = Number(rule.thresholdValue);
      if (!Number.isFinite(thresholdValue)) {
        this.reportUnevaluable(
          rule,
          `threshold ${String(rule.thresholdValue)} is not a number`,
        );
        continue;
      }

      const comparison = this.compare(feature, rule.operator, thresholdValue);

      if (comparison === null) {
        this.reportUnevaluable(
          rule,
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
  private reportUnevaluable(rule: FraudRuleConfigEntity, reason: string): void {
    const key = `${rule.ruleCode}:${reason}`;
    if (this.reportedRules.has(key)) {
      return;
    }

    this.reportedRules.add(key);
    this.logger.warn(
      `Rule ${rule.ruleCode} ("${rule.ruleName}") is not being evaluated: ${reason}.`,
    );
  }

  private resolveFeature(
    features: FraudFeatures,
    featureName: string,
  ): ResolvedFeature {
    if (!Object.prototype.hasOwnProperty.call(features, featureName)) {
      return { kind: 'absent' };
    }

    const raw: FraudFeatureValue | undefined = features[featureName];

    if (raw === undefined || raw === null) {
      return { kind: 'absent' };
    }

    if (typeof raw === 'boolean') {
      return { kind: 'boolean', value: raw };
    }

    if (typeof raw === 'number') {
      // NaN and Infinity compare false against everything, which would make
      // the rule look evaluated when it was not.
      return Number.isFinite(raw)
        ? { kind: 'number', value: raw }
        : { kind: 'unusable' };
    }

    /*
     * Numeric strings are accepted: SQL Server returns DECIMAL as a string
     * through some driver paths, and a feature that has been round-tripped
     * through storage should still compare.
     */
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed === '') {
        return { kind: 'unusable' };
      }

      const parsed = Number(trimmed);
      return Number.isFinite(parsed)
        ? { kind: 'number', value: parsed }
        : { kind: 'unusable' };
    }

    // An object or array cannot be compared against a numeric threshold.
    return { kind: 'unusable' };
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

  /*
   * null means the comparison could not be made, which is not the same as
   * false: false is a rule that was evaluated and did not trigger.
   */
  private compare(
    feature:
      { kind: 'boolean'; value: boolean } | { kind: 'number'; value: number },
    operator: string,
    thresholdValue: number,
  ): boolean | null {
    if (feature.kind === 'boolean') {
      // Config thresholds express a boolean as 1/0, or any non-zero as true,
      // without coercing the feature itself to a number.
      const thresholdAsBoolean = thresholdValue !== 0;

      switch (operator) {
        case '=':
          return feature.value === thresholdAsBoolean;
        case '!=':
          return feature.value !== thresholdAsBoolean;
        default:
          // Ordering a boolean is a configuration mistake, not a false result.
          return null;
      }
    }

    switch (operator) {
      case '>':
        return feature.value > thresholdValue;
      case '>=':
        return feature.value >= thresholdValue;
      case '<':
        return feature.value < thresholdValue;
      case '<=':
        return feature.value <= thresholdValue;
      case '=':
        return feature.value === thresholdValue;
      case '!=':
        return feature.value !== thresholdValue;
      default:
        return null;
    }
  }
}
