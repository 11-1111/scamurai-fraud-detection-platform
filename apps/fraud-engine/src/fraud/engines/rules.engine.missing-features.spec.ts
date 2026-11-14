import { Logger } from '@nestjs/common';

import { FraudRuleConfigEntity } from '../../database/entities/fraud-rule-config.entity';
import { RulesEngine } from './rules.engine';

/*
 * Rules whose feature is missing or unusable.
 *
 * The engine used to read `Number(featureValue ?? 0)`, so a rule naming a
 * feature that had not been calculated compared against zero. Every `<` and
 * `<=` rule with a positive threshold then fired on every transaction it
 * saw, and `=` against a threshold of zero did the same -- confidently,
 * permanently, and with a message quoting a feature value of 0 that no
 * calculator ever produced.
 *
 * An unevaluable rule must not fire, and must not be silent either.
 */

function rule(
  overrides: Partial<FraudRuleConfigEntity>,
): FraudRuleConfigEntity {
  return {
    ruleCode: 'TEST_RULE',
    ruleName: 'Test rule',
    featureName: 'deviceDistinctCardsLast1Hour',
    operator: '>=',
    thresholdValue: 3,
    severity: 'HIGH',
    scoreImpact: 25,
    isEnabled: true,
    ...overrides,
  } as FraudRuleConfigEntity;
}

describe('RulesEngine with missing or unusable features', () => {
  let ruleConfigRepo: { find: jest.Mock };
  let engine: RulesEngine;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    ruleConfigRepo = { find: jest.fn() };
    engine = new RulesEngine(ruleConfigRepo as never);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /*
   * The regression, stated as the operators that were actually affected. Each
   * of these fired on every transaction when the absent feature became zero.
   */
  it.each([
    ['<', 5],
    ['<=', 5],
    ['=', 0],
    ['!=', 1],
  ])(
    'does not fire a %s rule when the feature was never calculated',
    async (operator, thresholdValue) => {
      ruleConfigRepo.find.mockResolvedValue([
        rule({
          operator,
          thresholdValue,
          featureName: 'featureNobodyComputed',
        }),
      ]);

      // A populated feature map that simply lacks the one the rule names.
      const triggered = await engine.evaluate({
        deviceDistinctCardsLast1Hour: 1,
      });

      expect(triggered).toHaveLength(0);
    },
  );

  it('reports an unevaluable rule rather than failing silently', async () => {
    ruleConfigRepo.find.mockResolvedValue([
      rule({
        ruleCode: 'RENAMED_FEATURE',
        featureName: 'featureNobodyComputed',
      }),
    ]);

    await engine.evaluate({ deviceDistinctCardsLast1Hour: 1 });

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('RENAMED_FEATURE'),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('featureNobodyComputed'),
    );
  });

  it('warns once per problem, not once per transaction', async () => {
    ruleConfigRepo.find.mockResolvedValue([
      rule({ featureName: 'featureNobodyComputed' }),
    ]);

    for (let run = 0; run < 25; run += 1) {
      await engine.evaluate({ deviceDistinctCardsLast1Hour: 1 });
    }

    // At volume, one warning per transaction would bury the log it belongs in.
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])(
    'treats a %s feature value as absent, not as zero',
    async (_label, value) => {
      ruleConfigRepo.find.mockResolvedValue([
        rule({ operator: '<', thresholdValue: 5 }),
      ]);

      const triggered = await engine.evaluate({
        deviceDistinctCardsLast1Hour: value as never,
      });

      expect(triggered).toHaveLength(0);
    },
  );

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('refuses to evaluate against %s', async (_label, value) => {
    ruleConfigRepo.find.mockResolvedValue([
      rule({ operator: '>', thresholdValue: 3 }),
    ]);

    const triggered = await engine.evaluate({
      deviceDistinctCardsLast1Hour: value,
    });

    expect(triggered).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
  });

  it.each([
    ['an object', { count: 4 }],
    ['an array', [1, 2, 3]],
    ['a non-numeric string', 'several'],
    ['an empty string', '   '],
  ])('refuses to evaluate %s as a number', async (_label, value) => {
    ruleConfigRepo.find.mockResolvedValue([
      rule({ operator: '<', thresholdValue: 10 }),
    ]);

    const triggered = await engine.evaluate({
      deviceDistinctCardsLast1Hour: value,
    });

    expect(triggered).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
  });

  it('still compares a numeric string, which storage can produce', async () => {
    // SQL Server returns DECIMAL as a string through some driver paths, so a
    // feature round-tripped through storage should still compare.
    ruleConfigRepo.find.mockResolvedValue([
      rule({ operator: '>=', thresholdValue: 3 }),
    ]);

    const triggered = await engine.evaluate({
      deviceDistinctCardsLast1Hour: '4.0',
    });

    expect(triggered).toHaveLength(1);
    expect(triggered[0].featureValue).toBe(4);
  });

  it('refuses to evaluate a rule whose threshold is not a number', async () => {
    ruleConfigRepo.find.mockResolvedValue([
      rule({ thresholdValue: 'three' as never, operator: '<' }),
    ]);

    const triggered = await engine.evaluate({
      deviceDistinctCardsLast1Hour: 1,
    });

    expect(triggered).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('threshold'));
  });

  it('refuses to order a boolean feature instead of reporting false', async () => {
    // `>` against a boolean is a configuration mistake. Returning false would
    // make a broken rule look like a rule that simply did not match.
    ruleConfigRepo.find.mockResolvedValue([
      rule({
        featureName: 'orderTrackingIdSuccessExists',
        operator: '>',
        thresholdValue: 0,
      }),
    ]);

    const triggered = await engine.evaluate({
      orderTrackingIdSuccessExists: true,
    });

    expect(triggered).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('operator'));
  });

  it('reports an unknown operator', async () => {
    ruleConfigRepo.find.mockResolvedValue([
      rule({ operator: 'BETWEEN', thresholdValue: 3 }),
    ]);

    const triggered = await engine.evaluate({
      deviceDistinctCardsLast1Hour: 4,
    });

    expect(triggered).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
  });

  it('evaluates the rules it can while skipping the ones it cannot', async () => {
    // One bad rule must not stop the rest of the rule set from scoring.
    ruleConfigRepo.find.mockResolvedValue([
      rule({
        ruleCode: 'BROKEN',
        featureName: 'featureNobodyComputed',
        operator: '<',
        thresholdValue: 5,
      }),
      rule({ ruleCode: 'WORKING', operator: '>=', thresholdValue: 3 }),
    ]);

    const triggered = await engine.evaluate({
      deviceDistinctCardsLast1Hour: 12,
    });

    expect(triggered).toHaveLength(1);
    expect(triggered[0].ruleCode).toBe('WORKING');
  });
});
