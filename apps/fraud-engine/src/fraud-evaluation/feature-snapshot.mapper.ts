import { BadRequestException } from '@nestjs/common';
import { FraudFeatureValueType } from '../database/entities/fraud-transaction-feature.entity';
import { CalculatedFeature, FraudFeatureValue } from '../fraud/types/fraud.types';

export interface ConvertedFeatureValue {
  valueType: FraudFeatureValueType;
  numericValue?: number;
  booleanValue?: boolean;
  stringValue?: string;
  jsonValue?: string;
}

/**
 * Detects duplicate feature names before any persistence write.
 * Throws BadRequestException when duplicates exist.
 */
export function assertUniqueFeatureNames(
  calculatedFeatures: CalculatedFeature[],
): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const feature of calculatedFeatures) {
    const name = feature.name?.trim();
    if (!name) {
      throw new BadRequestException('Feature name is required.');
    }
    if (seen.has(name)) {
      duplicates.add(name);
    } else {
      seen.add(name);
    }
  }

  if (duplicates.size > 0) {
    throw new BadRequestException(
      `Duplicate feature names are not allowed: ${[...duplicates].join(', ')}`,
    );
  }
}

/**
 * Converts a CalculatedFeature value into typed persistence columns.
 */
export function convertFraudFeatureValue(
  value: FraudFeatureValue,
): ConvertedFeatureValue {
  if (value === null) {
    return { valueType: FraudFeatureValueType.NULL };
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new BadRequestException(
        'Numeric feature values must be finite (NaN and Infinity are not allowed).',
      );
    }
    return {
      valueType: FraudFeatureValueType.NUMBER,
      numericValue: value,
    };
  }

  if (typeof value === 'boolean') {
    return {
      valueType: FraudFeatureValueType.BOOLEAN,
      booleanValue: value,
    };
  }

  if (typeof value === 'string') {
    return {
      valueType: FraudFeatureValueType.STRING,
      stringValue: value,
    };
  }

  if (typeof value === 'object') {
    return {
      valueType: FraudFeatureValueType.JSON,
      jsonValue: JSON.stringify(value),
    };
  }

  throw new BadRequestException(
    `Unsupported feature value type: ${typeof value}`,
  );
}
