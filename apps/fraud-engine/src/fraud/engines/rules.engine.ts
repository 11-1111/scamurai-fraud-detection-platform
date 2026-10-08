import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudRuleConfigEntity } from '../../database/entities/fraud-rule-config.entity';
import {
  FraudFeatureValue,
  FraudFeatures,
  TriggeredRule,
} from '../types/fraud.types';

@Injectable()
export class RulesEngine {
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
      const rawFeatureValue = features[rule.featureName];
      const thresholdValue = Number(rule.thresholdValue ?? 0);

      if (!this.compare(rawFeatureValue, rule.operator, thresholdValue)) {
        continue;
      }

      const featureValue =
        typeof rawFeatureValue === 'boolean'
          ? rawFeatureValue
          : Number(rawFeatureValue ?? 0);

      triggeredRules.push({
        ruleCode: rule.ruleCode,
        ruleName: rule.ruleName,
        severity: this.normalizeSeverity(rule.severity),
        scoreImpact: Number(rule.scoreImpact ?? 0),
        message: `Rule ${rule.ruleCode} triggered because ${rule.featureName} value ${String(featureValue)} ${rule.operator} threshold ${thresholdValue}.`,
        featureName: rule.featureName,
        featureValue,
        operator: rule.operator,
        thresholdValue,
      });
    }

    return triggeredRules;
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

  private compare(
    featureValue: FraudFeatureValue | undefined,
    operator: string,
    thresholdValue: number,
  ): boolean {
    // Boolean features compare as true/false. Config thresholds use 1/0
    // (or any non-zero as true) without coercing the feature itself to a number.
    if (typeof featureValue === 'boolean') {
      const thresholdAsBoolean = this.toBooleanThreshold(thresholdValue);
      switch (operator) {
        case '=':
          return featureValue === thresholdAsBoolean;
        case '!=':
          return featureValue !== thresholdAsBoolean;
        default:
          return false;
      }
    }

    const numericFeatureValue = Number(featureValue ?? 0);
    switch (operator) {
      case '>':
        return numericFeatureValue > thresholdValue;
      case '>=':
        return numericFeatureValue >= thresholdValue;
      case '<':
        return numericFeatureValue < thresholdValue;
      case '<=':
        return numericFeatureValue <= thresholdValue;
      case '=':
        return numericFeatureValue === thresholdValue;
      case '!=':
        return numericFeatureValue !== thresholdValue;
      default:
        return false;
    }
  }

  private toBooleanThreshold(thresholdValue: number): boolean {
    return thresholdValue !== 0;
  }
}
