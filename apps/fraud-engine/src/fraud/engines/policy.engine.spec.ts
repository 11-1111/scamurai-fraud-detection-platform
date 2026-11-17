import { Logger } from '@nestjs/common';

import { FraudPolicyRuleEntity } from '../../database/entities/fraud-policy-rule.entity';
import { PolicyEngine } from './policy.engine';

/*
 * Policy matching.
 *
 * The bug this covers only stayed hidden because every seeded policy sets
 * both score bounds. min_risk_score and max_risk_score are nullable and null
 * means unbounded, but the guards tested `!== undefined` -- and TypeORM
 * returns null, not undefined, for a nullable column. null then reached the
 * comparison, where `riskScore > null` coerces to `riskScore > 0`, so a
 * policy with no upper bound matched nothing scoring above zero. The exact
 * opposite of unbounded, in a policy that looked correctly configured.
 */

function policy(
  overrides: Partial<FraudPolicyRuleEntity>,
): FraudPolicyRuleEntity {
  return {
    policyCode: 'TEST_POLICY',
    policyName: 'Test policy',
    decision: 'BLOCK',
    actionLabel: 'Block the transaction',
    priority: 10,
    isEnabled: true,
    ...overrides,
  } as FraudPolicyRuleEntity;
}

const DEFAULTS = {
  riskLevel: 'HIGH',
  defaultDecision: 'ALLOW',
  features: {},
};

describe('PolicyEngine', () => {
  let policyRuleRepo: { find: jest.Mock };
  let engine: PolicyEngine;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    policyRuleRepo = { find: jest.fn() };
    engine = new PolicyEngine(policyRuleRepo as never);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('score bounds', () => {
    it('applies a policy with no upper bound to a high score', async () => {
      // The regression: maxRiskScore null means unbounded.
      policyRuleRepo.find.mockResolvedValue([
        policy({ minRiskScore: 70, maxRiskScore: null as never }),
      ]);

      const result = await engine.evaluatePolicy({
        ...DEFAULTS,
        riskScore: 95,
      });

      expect(result.finalDecision).toBe('BLOCK');
      expect(result.policyActions).toHaveLength(1);
    });

    it('applies a policy with no lower bound to a low score', async () => {
      policyRuleRepo.find.mockResolvedValue([
        policy({ minRiskScore: null as never, maxRiskScore: 30 }),
      ]);

      const result = await engine.evaluatePolicy({
        ...DEFAULTS,
        riskScore: 5,
      });

      expect(result.finalDecision).toBe('BLOCK');
    });

    it('applies a policy with neither bound to any score', async () => {
      policyRuleRepo.find.mockResolvedValue([
        policy({ minRiskScore: null as never, maxRiskScore: null as never }),
      ]);

      const result = await engine.evaluatePolicy({
        ...DEFAULTS,
        riskScore: 42,
      });

      expect(result.finalDecision).toBe('BLOCK');
    });

    it('still respects bounds that are set', async () => {
      policyRuleRepo.find.mockResolvedValue([
        policy({ minRiskScore: 70, maxRiskScore: 90 }),
      ]);

      const below = await engine.evaluatePolicy({ ...DEFAULTS, riskScore: 60 });
      const inside = await engine.evaluatePolicy({
        ...DEFAULTS,
        riskScore: 80,
      });
      const above = await engine.evaluatePolicy({ ...DEFAULTS, riskScore: 95 });

      expect(below.policyActions).toHaveLength(0);
      expect(inside.policyActions).toHaveLength(1);
      expect(above.policyActions).toHaveLength(0);
    });

    it('treats a zero bound as a bound, not as absent', async () => {
      // 0 is falsy, so a truthiness check here would read it as unbounded.
      policyRuleRepo.find.mockResolvedValue([
        policy({ minRiskScore: 0, maxRiskScore: 0 }),
      ]);

      const atZero = await engine.evaluatePolicy({ ...DEFAULTS, riskScore: 0 });
      const aboveZero = await engine.evaluatePolicy({
        ...DEFAULTS,
        riskScore: 1,
      });

      expect(atZero.policyActions).toHaveLength(1);
      expect(aboveZero.policyActions).toHaveLength(0);
    });

    it('refuses a policy whose bound is not a number', async () => {
      policyRuleRepo.find.mockResolvedValue([
        policy({ maxRiskScore: 'ninety' as never }),
      ]);

      const result = await engine.evaluatePolicy({
        ...DEFAULTS,
        riskScore: 50,
      });

      // Not applying is the safe reading of a malformed bound: treating it as
      // unbounded could make a BLOCK policy match everything.
      expect(result.policyActions).toHaveLength(0);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('max_risk_score'),
      );
    });
  });

  describe('feature conditions', () => {
    it.each([
      ['<', 5],
      ['<=', 5],
      ['=', 0],
    ])(
      'does not apply a %s condition when the feature was not calculated',
      async (operator, conditionValue) => {
        policyRuleRepo.find.mockResolvedValue([
          policy({
            conditionFeature: 'featureNobodyComputed',
            operator,
            conditionValue,
          }),
        ]);

        const result = await engine.evaluatePolicy({
          ...DEFAULTS,
          riskScore: 50,
          features: { deviceDistinctCardsLast1Hour: 2 },
        });

        // Falling back to the risk level's default decision is the
        // conservative outcome.
        expect(result.finalDecision).toBe('ALLOW');
        expect(result.policyActions).toHaveLength(0);
      },
    );

    it('reports a condition it cannot evaluate', async () => {
      policyRuleRepo.find.mockResolvedValue([
        policy({
          policyCode: 'STALE_CONDITION',
          conditionFeature: 'featureNobodyComputed',
          operator: '>',
          conditionValue: 1,
        }),
      ]);

      await engine.evaluatePolicy({ ...DEFAULTS, riskScore: 50 });

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('STALE_CONDITION'),
      );
    });

    it('applies a condition that holds', async () => {
      policyRuleRepo.find.mockResolvedValue([
        policy({
          conditionFeature: 'deviceDistinctCardsLast1Hour',
          operator: '>=',
          conditionValue: 3,
        }),
      ]);

      const result = await engine.evaluatePolicy({
        ...DEFAULTS,
        riskScore: 50,
        features: { deviceDistinctCardsLast1Hour: 12 },
      });

      expect(result.finalDecision).toBe('BLOCK');
    });

    it('does not apply a condition that does not hold', async () => {
      policyRuleRepo.find.mockResolvedValue([
        policy({
          conditionFeature: 'deviceDistinctCardsLast1Hour',
          operator: '>=',
          conditionValue: 10,
        }),
      ]);

      const result = await engine.evaluatePolicy({
        ...DEFAULTS,
        riskScore: 50,
        features: { deviceDistinctCardsLast1Hour: 2 },
      });

      expect(result.policyActions).toHaveLength(0);
      // A condition that simply did not match is not a misconfiguration.
      expect(warn).not.toHaveBeenCalled();
    });

    it('evaluates a boolean condition', async () => {
      policyRuleRepo.find.mockResolvedValue([
        policy({
          conditionFeature: 'orderTrackingIdSuccessExists',
          operator: '=',
          conditionValue: 1,
        }),
      ]);

      const result = await engine.evaluatePolicy({
        ...DEFAULTS,
        riskScore: 50,
        features: { orderTrackingIdSuccessExists: true },
      });

      expect(result.finalDecision).toBe('BLOCK');
    });

    it('refuses to order a boolean condition', async () => {
      policyRuleRepo.find.mockResolvedValue([
        policy({
          conditionFeature: 'orderTrackingIdSuccessExists',
          operator: '>',
          conditionValue: 0,
        }),
      ]);

      const result = await engine.evaluatePolicy({
        ...DEFAULTS,
        riskScore: 50,
        features: { orderTrackingIdSuccessExists: true },
      });

      expect(result.policyActions).toHaveLength(0);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('operator'));
    });
  });

  describe('decisions', () => {
    it('takes the highest-priority match, as ordered by the query', async () => {
      policyRuleRepo.find.mockResolvedValue([
        policy({ policyCode: 'FIRST', decision: 'BLOCK', priority: 20 }),
        policy({
          policyCode: 'SECOND',
          decision: 'MANUAL_REVIEW',
          priority: 10,
        }),
      ]);

      const result = await engine.evaluatePolicy({
        ...DEFAULTS,
        riskScore: 50,
      });

      expect(result.finalDecision).toBe('BLOCK');
      expect(result.policyActions).toHaveLength(2);
    });

    it('falls back to the default decision when nothing matches', async () => {
      policyRuleRepo.find.mockResolvedValue([policy({ minRiskScore: 90 })]);

      const result = await engine.evaluatePolicy({
        ...DEFAULTS,
        riskScore: 10,
        defaultDecision: 'ALLOW_WITH_MONITORING',
      });

      expect(result.finalDecision).toBe('ALLOW_WITH_MONITORING');
    });

    it('matches on risk level regardless of case', async () => {
      policyRuleRepo.find.mockResolvedValue([
        policy({ riskLevel: '  high  ' }),
      ]);

      const result = await engine.evaluatePolicy({
        ...DEFAULTS,
        riskScore: 50,
        riskLevel: 'HIGH',
      });

      expect(result.finalDecision).toBe('BLOCK');
    });

    it('applies one misconfigured policy without blocking the others', async () => {
      policyRuleRepo.find.mockResolvedValue([
        policy({
          policyCode: 'BROKEN',
          priority: 20,
          conditionFeature: 'featureNobodyComputed',
          operator: '>',
          conditionValue: 1,
        }),
        policy({
          policyCode: 'WORKING',
          priority: 10,
          decision: 'MANUAL_REVIEW',
        }),
      ]);

      const result = await engine.evaluatePolicy({
        ...DEFAULTS,
        riskScore: 50,
      });

      expect(result.policyActions).toHaveLength(1);
      expect(result.finalDecision).toBe('MANUAL_REVIEW');
    });
  });
});
