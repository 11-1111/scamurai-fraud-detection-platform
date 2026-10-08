import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { FeatureEngine } from './feature.engine';
import type { FeatureCalculator } from '../features/feature-calculator.interface';
import type { FeatureContext } from '../features/feature-context';

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

const emptyRelatedIdentifiers = {
  emails: [],
  phones: [],
  ips: [],
  paymentAccounts: [],
  fingerprints: [],
  merchants: [],
  confirmationCodes: [],
  orderTrackingIds: [],
  bankAuthCodes: [],
};

function createMockCalculator(
  overrides: Partial<FeatureCalculator> & Pick<FeatureCalculator, 'featureName'>,
): FeatureCalculator {
  return {
    label: overrides.featureName,
    description: `${overrides.featureName} description`,
    category: 'Velocity',
    dataType: 'number',
    supportedOperators: ['>'],
    defaultValue: 0,
    version: '1.0.0',
    executionOrder: 100,
    calculate: async () => 1,
    ...overrides,
  };
}

describe('FeatureEngine', () => {
  let fraudTransactionRepo: { find: jest.Mock };
  let fraudIdentifierRepo: { createQueryBuilder: jest.Mock };
  let utils: {
    isFailedStatus: jest.Mock;
    isSuccessfulStatus: jest.Mock;
  };

  const input: FeatureContext = {
    type: 'email',
    value: 'a@example.com',
    relatedIdentifiers: emptyRelatedIdentifiers,
    transaction: null,
  };

  beforeEach(() => {
    fraudTransactionRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    fraudIdentifierRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    utils = {
      isFailedStatus: jest.fn().mockReturnValue(false),
      isSuccessfulStatus: jest.fn().mockReturnValue(false),
    };
  });

  function createEngine(calculators: FeatureCalculator[]): FeatureEngine {
    return new FeatureEngine(
      fraudTransactionRepo as never,
      fraudIdentifierRepo as never,
      utils as never,
      calculators,
    );
  }

  it('derives advanced feature metadata directly from calculators', async () => {
    const engine = createEngine([
      createMockCalculator({
        featureName: 'failedTxnCountPerCardLast15Minutes',
        label: 'Failed transactions per card in last 15 minutes',
        category: 'Velocity',
        unit: 'transactions',
        windowSeconds: 900,
        executionOrder: 10,
        calculate: async () => 3,
      }),
    ]);

    const result = await engine.calculateFeatures(input);
    const advancedFeature = result.calculatedFeatures.find(
      (feature) => feature.name === 'failedTxnCountPerCardLast15Minutes',
    );

    expect(advancedFeature).toEqual(
      expect.objectContaining({
        name: 'failedTxnCountPerCardLast15Minutes',
        label: 'Failed transactions per card in last 15 minutes',
        description: 'failedTxnCountPerCardLast15Minutes description',
        category: 'Velocity',
        value: 3,
        unit: 'transactions',
        windowSeconds: 900,
      }),
    );
  });

  it('executes calculators in deterministic executionOrder with featureName tie-breaker', async () => {
    const executionOrder: string[] = [];

    const engine = createEngine([
      createMockCalculator({
        featureName: 'zFeature',
        executionOrder: 10,
        calculate: async () => {
          executionOrder.push('zFeature');
          return 1;
        },
      }),
      createMockCalculator({
        featureName: 'aFeature',
        executionOrder: 10,
        calculate: async () => {
          executionOrder.push('aFeature');
          return 2;
        },
      }),
      createMockCalculator({
        featureName: 'middleFeature',
        executionOrder: 20,
        calculate: async () => {
          executionOrder.push('middleFeature');
          return 3;
        },
      }),
    ]);

    await engine.calculateFeatures(input);

    expect(executionOrder).toEqual(['aFeature', 'zFeature', 'middleFeature']);
  });

  it('uses numeric defaultValue when a numeric calculator fails', async () => {
    const loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const engine = createEngine([
      createMockCalculator({
        featureName: 'numericFailure',
        dataType: 'number',
        defaultValue: 0,
        calculate: async () => {
          throw new Error('numeric failure');
        },
      }),
      createMockCalculator({
        featureName: 'stillRuns',
        executionOrder: 20,
        calculate: async () => 7,
      }),
    ]);

    const result = await engine.calculateFeatures(input);

    expect(result.featureMap.numericFailure).toBe(0);
    expect(result.featureMap.stillRuns).toBe(7);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('numericFailure'),
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('defaultValue=0'),
    );
  });

  it('uses boolean defaultValue when a boolean calculator fails', async () => {
    const engine = createEngine([
      createMockCalculator({
        featureName: 'booleanFailure',
        dataType: 'boolean',
        defaultValue: false,
        supportedOperators: ['='],
        calculate: async () => {
          throw new Error('boolean failure');
        },
      }),
    ]);

    const result = await engine.calculateFeatures(input);

    expect(result.featureMap.booleanFailure).toBe(false);
    expect(typeof result.featureMap.booleanFailure).toBe('boolean');
  });

  it('keeps featureMap values aligned with calculatedFeatures values', async () => {
    const engine = createEngine([
      createMockCalculator({
        featureName: 'alignedFeature',
        calculate: async () => 42,
      }),
    ]);

    const result = await engine.calculateFeatures(input);

    for (const feature of result.calculatedFeatures) {
      expect(result.featureMap[feature.name]).toBe(feature.value);
    }
  });
});

describe('FeatureEngine architectural verification', () => {
  it('does not contain PLUGIN_FEATURE_NAMES', () => {
    const source = fs.readFileSync(path.join(__dirname, 'feature.engine.ts'), 'utf8');
    expect(source).not.toContain('PLUGIN_FEATURE_NAMES');
  });

  it('does not contain getDefaultAdvancedFeatures', () => {
    const source = fs.readFileSync(path.join(__dirname, 'feature.engine.ts'), 'utf8');
    expect(source).not.toContain('getDefaultAdvancedFeatures');
  });

  it('does not contain advanced FEATURE_DISPLAY_META entries', () => {
    const source = fs.readFileSync(path.join(__dirname, 'feature.engine.ts'), 'utf8');
    expect(source).not.toContain('FEATURE_DISPLAY_META');
  });
});

describe('Registered advanced feature calculators', () => {
  it('defines metadata on all 12 expected feature implementations', () => {
    const featuresRoot = path.join(__dirname, '..', 'features');
    const featureFiles = collectFeatureImplementationFiles(featuresRoot);

    expect(featureFiles).toHaveLength(12);

    for (const filePath of featureFiles) {
      const source = fs.readFileSync(filePath, 'utf8');
      expect(source).toMatch(/readonly defaultValue =/);
      expect(source).toMatch(/readonly version =/);
      expect(source).toMatch(/readonly executionOrder =/);
    }
  });
});

function collectFeatureImplementationFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFeatureImplementationFiles(entryPath));
      continue;
    }

    if (entry.name.endsWith('.feature.ts')) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

export { EXPECTED_ADVANCED_FEATURE_NAMES };
