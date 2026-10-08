import { FeatureCatalogService } from './feature-catalog.service';
import type { FeatureCalculator } from './feature-calculator.interface';

const EXPECTED_ADVANCED_FEATURE_NAMES = [
  'failedTxnCountPerCardLast15Minutes',
  'failedTxnCountPerEmailLast15Minutes',
  'failedTxnCountPerPhoneLast15Minutes',
  'failedTxnCountPerDeviceLast15Minutes',
  'deviceDistinctCardsLast1Hour',
  'ipDistinctCardsLast15Minutes',
  'accountCurrentAmountToAverage30dRatio',
  'accountTodayTotalToAverageDaily30dRatio',
  'merchantTodayTotalToAverageDaily7dRatio',
  'merchantDistinctCardsLast15Minutes',
  'merchantRefDistinctPaymentAccounts24h',
  'orderTrackingIdSuccessExists',
];

function createCalculator(
  featureName: string,
  executionOrder: number,
  overrides: Partial<FeatureCalculator> = {},
): FeatureCalculator {
  return {
    featureName,
    label: `${featureName} label`,
    description: `${featureName} description`,
    category: 'Velocity',
    dataType: 'number',
    supportedOperators: ['>'],
    defaultValue: 0,
    unit: 'transactions',
    windowSeconds: 900,
    version: '1.0.0',
    executionOrder,
    calculate: async () => 0,
    ...overrides,
  };
}

describe('FeatureCatalogService', () => {
  it('returns calculator metadata including unit, windowSeconds, and version', () => {
    const service = new FeatureCatalogService([
      createCalculator('alphaFeature', 20),
      createCalculator('betaFeature', 10, {
        dataType: 'boolean',
        defaultValue: false,
        supportedOperators: ['=', '!='],
        unit: undefined,
        windowSeconds: undefined,
        category: 'Replay / Duplicate Prevention',
      }),
    ]);

    expect(service.getAvailableFeatures()).toEqual([
      {
        featureName: 'betaFeature',
        label: 'betaFeature label',
        description: 'betaFeature description',
        category: 'Replay / Duplicate Prevention',
        dataType: 'boolean',
        supportedOperators: ['=', '!='],
        version: '1.0.0',
      },
      {
        featureName: 'alphaFeature',
        label: 'alphaFeature label',
        description: 'alphaFeature description',
        category: 'Velocity',
        dataType: 'number',
        supportedOperators: ['>'],
        unit: 'transactions',
        windowSeconds: 900,
        version: '1.0.0',
      },
    ]);
  });

  it('includes all 12 expected advanced feature names when fully registered', () => {
    const calculators = EXPECTED_ADVANCED_FEATURE_NAMES.map((featureName, index) =>
      createCalculator(featureName, (index + 1) * 10),
    );

    const service = new FeatureCatalogService(calculators);
    const names = service.getAvailableFeatures().map((entry) => entry.featureName);

    expect(names).toEqual(EXPECTED_ADVANCED_FEATURE_NAMES);
  });
});
