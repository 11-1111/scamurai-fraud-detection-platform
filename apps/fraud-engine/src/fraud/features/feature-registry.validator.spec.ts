import type { FeatureCalculator } from './feature-calculator.interface';
import { validateFeatureCalculators } from './feature-registry.validator';

function createValidCalculator(
  overrides: Partial<FeatureCalculator> = {},
): FeatureCalculator {
  return {
    featureName: 'sampleFeature',
    label: 'Sample Feature',
    description: 'Sample description',
    category: 'Velocity',
    dataType: 'number',
    supportedOperators: ['>'],
    defaultValue: 0,
    version: '1.0.0',
    executionOrder: 1,
    calculate: async () => 0,
    ...overrides,
  };
}

describe('validateFeatureCalculators', () => {
  it('accepts a valid calculator registry', () => {
    expect(() =>
      validateFeatureCalculators([
        createValidCalculator({ featureName: 'alphaFeature', executionOrder: 1 }),
        createValidCalculator({
          featureName: 'betaFeature',
          executionOrder: 2,
          dataType: 'boolean',
          defaultValue: false,
          supportedOperators: ['='],
        }),
      ]),
    ).not.toThrow();
  });

  it('throws for empty feature names', () => {
    expect(() =>
      validateFeatureCalculators([createValidCalculator({ featureName: '   ' })]),
    ).toThrow('featureName is required');
  });

  it('throws for duplicate feature names', () => {
    expect(() =>
      validateFeatureCalculators([
        createValidCalculator({ featureName: 'duplicateFeature' }),
        createValidCalculator({ featureName: 'duplicateFeature', executionOrder: 2 }),
      ]),
    ).toThrow('duplicate featureName "duplicateFeature"');
  });

  it('throws when dataType and defaultValue mismatch for numbers', () => {
    expect(() =>
      validateFeatureCalculators([
        createValidCalculator({ dataType: 'number', defaultValue: false as never }),
      ]),
    ).toThrow('defaultValue must be a number');
  });

  it('throws when dataType and defaultValue mismatch for booleans', () => {
    expect(() =>
      validateFeatureCalculators([
        createValidCalculator({
          dataType: 'boolean',
          defaultValue: 0 as never,
          supportedOperators: ['='],
        }),
      ]),
    ).toThrow('defaultValue must be a boolean');
  });

  it('throws for invalid executionOrder', () => {
    expect(() =>
      validateFeatureCalculators([
        createValidCalculator({ executionOrder: Number.NaN }),
      ]),
    ).toThrow('executionOrder must be a finite number');
  });

  it('throws for invalid windowSeconds', () => {
    expect(() =>
      validateFeatureCalculators([
        createValidCalculator({ windowSeconds: 0 }),
      ]),
    ).toThrow('windowSeconds must be a positive number');
  });

  it('throws for empty supportedOperators', () => {
    expect(() =>
      validateFeatureCalculators([
        createValidCalculator({ supportedOperators: [] }),
      ]),
    ).toThrow('supportedOperators must be non-empty');
  });
});
