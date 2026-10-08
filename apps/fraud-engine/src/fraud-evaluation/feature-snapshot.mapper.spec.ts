import { BadRequestException } from '@nestjs/common';
import { FraudFeatureValueType } from '../database/entities/fraud-transaction-feature.entity';
import { CalculatedFeature } from '../fraud/types/fraud.types';
import {
  assertUniqueFeatureNames,
  convertFraudFeatureValue,
} from './feature-snapshot.mapper';

describe('feature-snapshot.mapper', () => {
  const baseFeature = (
    overrides: Partial<CalculatedFeature> & Pick<CalculatedFeature, 'name' | 'value'>,
  ): CalculatedFeature => ({
    label: overrides.label ?? overrides.name,
    category: overrides.category ?? 'General',
    calculatedAt: overrides.calculatedAt ?? new Date('2026-07-27T00:00:00.000Z'),
    ...overrides,
  });

  describe('assertUniqueFeatureNames', () => {
    it('allows unique feature names', () => {
      expect(() =>
        assertUniqueFeatureNames([
          baseFeature({ name: 'a', value: 1 }),
          baseFeature({ name: 'b', value: 2 }),
        ]),
      ).not.toThrow();
    });

    it('rejects duplicate feature names', () => {
      expect(() =>
        assertUniqueFeatureNames([
          baseFeature({ name: 'failedTxnCountPerCardLast15Minutes', value: 1 }),
          baseFeature({ name: 'failedTxnCountPerCardLast15Minutes', value: 2 }),
        ]),
      ).toThrow(BadRequestException);
    });
  });

  describe('convertFraudFeatureValue', () => {
    it('converts number values', () => {
      expect(convertFraudFeatureValue(12.5)).toEqual({
        valueType: FraudFeatureValueType.NUMBER,
        numericValue: 12.5,
      });
    });

    it('converts boolean values', () => {
      expect(convertFraudFeatureValue(true)).toEqual({
        valueType: FraudFeatureValueType.BOOLEAN,
        booleanValue: true,
      });
      expect(convertFraudFeatureValue(false)).toEqual({
        valueType: FraudFeatureValueType.BOOLEAN,
        booleanValue: false,
      });

      const converted = convertFraudFeatureValue(true);
      expect(converted.numericValue).toBeUndefined();
      expect(converted.booleanValue).toBe(true);
      expect(converted.valueType).toBe(FraudFeatureValueType.BOOLEAN);
    });

    it('converts string values', () => {
      expect(convertFraudFeatureValue('HIGH')).toEqual({
        valueType: FraudFeatureValueType.STRING,
        stringValue: 'HIGH',
      });
    });

    it('converts object values to JSON', () => {
      expect(convertFraudFeatureValue({ a: 1 })).toEqual({
        valueType: FraudFeatureValueType.JSON,
        jsonValue: JSON.stringify({ a: 1 }),
      });
    });

    it('converts array values to JSON', () => {
      expect(convertFraudFeatureValue([1, 2])).toEqual({
        valueType: FraudFeatureValueType.JSON,
        jsonValue: JSON.stringify([1, 2]),
      });
    });

    it('converts null values', () => {
      expect(convertFraudFeatureValue(null)).toEqual({
        valueType: FraudFeatureValueType.NULL,
      });
    });

    it('rejects NaN', () => {
      expect(() => convertFraudFeatureValue(Number.NaN)).toThrow(
        BadRequestException,
      );
    });

    it('rejects Infinity', () => {
      expect(() => convertFraudFeatureValue(Number.POSITIVE_INFINITY)).toThrow(
        BadRequestException,
      );
    });

    it('rejects negative Infinity', () => {
      expect(() => convertFraudFeatureValue(Number.NEGATIVE_INFINITY)).toThrow(
        BadRequestException,
      );
    });
  });
});
