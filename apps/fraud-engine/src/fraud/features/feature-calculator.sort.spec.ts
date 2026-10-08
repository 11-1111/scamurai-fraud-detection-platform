import { sortFeatureCalculators } from './feature-calculator.sort';
import type { FeatureCalculator } from './feature-calculator.interface';

function createCalculator(
  featureName: string,
  executionOrder: number,
): FeatureCalculator {
  return {
    featureName,
    label: featureName,
    description: featureName,
    category: 'Velocity',
    dataType: 'number',
    supportedOperators: ['>'],
    defaultValue: 0,
    version: '1.0.0',
    executionOrder,
    calculate: async () => 0,
  };
}

describe('sortFeatureCalculators', () => {
  it('sorts by executionOrder ascending and featureName as tie-breaker', () => {
    const sorted = sortFeatureCalculators([
      createCalculator('zFeature', 10),
      createCalculator('aFeature', 10),
      createCalculator('middleFeature', 20),
    ]);

    expect(sorted.map((calculator) => calculator.featureName)).toEqual([
      'aFeature',
      'zFeature',
      'middleFeature',
    ]);
  });
});
