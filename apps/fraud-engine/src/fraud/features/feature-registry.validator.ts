import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { FeatureCalculator } from './feature-calculator.interface';
import { FEATURE_CALCULATORS } from './feature-registry';

export function validateFeatureCalculators(
  calculators: FeatureCalculator[],
): void {
  const seenNames = new Set<string>();

  for (const calculator of calculators) {
    const featureName = calculator.featureName?.trim();

    if (!featureName) {
      throw new Error('Feature calculator registration failed: featureName is required.');
    }

    if (seenNames.has(featureName)) {
      throw new Error(
        `Feature calculator registration failed: duplicate featureName "${featureName}".`,
      );
    }
    seenNames.add(featureName);

    if (!Number.isFinite(calculator.executionOrder)) {
      throw new Error(
        `Feature calculator registration failed: executionOrder must be a finite number for "${featureName}".`,
      );
    }

    if (!calculator.label?.trim()) {
      throw new Error(
        `Feature calculator registration failed: label is required for "${featureName}".`,
      );
    }

    if (!calculator.category?.trim()) {
      throw new Error(
        `Feature calculator registration failed: category is required for "${featureName}".`,
      );
    }

    if (!calculator.version?.trim()) {
      throw new Error(
        `Feature calculator registration failed: version is required for "${featureName}".`,
      );
    }

    if (
      !Array.isArray(calculator.supportedOperators) ||
      calculator.supportedOperators.length === 0
    ) {
      throw new Error(
        `Feature calculator registration failed: supportedOperators must be non-empty for "${featureName}".`,
      );
    }

    if (calculator.dataType === 'number' && typeof calculator.defaultValue !== 'number') {
      throw new Error(
        `Feature calculator registration failed: defaultValue must be a number for numeric feature "${featureName}".`,
      );
    }

    if (
      calculator.dataType === 'boolean' &&
      typeof calculator.defaultValue !== 'boolean'
    ) {
      throw new Error(
        `Feature calculator registration failed: defaultValue must be a boolean for boolean feature "${featureName}".`,
      );
    }

    if (
      calculator.windowSeconds !== undefined &&
      (!Number.isFinite(calculator.windowSeconds) || calculator.windowSeconds <= 0)
    ) {
      throw new Error(
        `Feature calculator registration failed: windowSeconds must be a positive number for "${featureName}".`,
      );
    }
  }
}

@Injectable()
export class FeatureRegistryValidator implements OnModuleInit {
  constructor(
    @Inject(FEATURE_CALCULATORS)
    private readonly calculators: FeatureCalculator[],
  ) {}

  onModuleInit(): void {
    validateFeatureCalculators(this.calculators);
  }
}
