import type { FeatureCalculator } from './feature-calculator.interface';

export function sortFeatureCalculators(
  calculators: FeatureCalculator[],
): FeatureCalculator[] {
  return [...calculators].sort(compareFeatureCalculators);
}

export function compareFeatureCalculators(
  left: FeatureCalculator,
  right: FeatureCalculator,
): number {
  const orderDifference = left.executionOrder - right.executionOrder;
  if (orderDifference !== 0) {
    return orderDifference;
  }

  return left.featureName.localeCompare(right.featureName);
}
