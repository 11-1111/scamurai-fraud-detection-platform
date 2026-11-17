import { Logger } from '@nestjs/common';

import { TriggeredRule } from '../types/fraud.types';
import { RiskScoreEngine } from './risk-score.engine';

/*
 * Risk score arithmetic.
 *
 * The additive model itself is left alone deliberately -- the risk-level
 * bands are configured as ranges on this scale, so changing how scores
 * distribute would reclassify everything. What these tests pin is the
 * arithmetic around it, where the failures were silent and in the dangerous
 * direction: a single unusable score impact turned the total into NaN, NaN
 * matched no configured band, and the fallback ladder compares NaN against
 * every threshold as false -- so every transaction came out LOW / ALLOW.
 */

function triggeredRule(ruleCode: string, scoreImpact: number): TriggeredRule {
  return {
    ruleCode,
    ruleName: ruleCode,
    severity: 'HIGH',
    scoreImpact,
    message: `${ruleCode} triggered`,
  };
}

describe('RiskScoreEngine', () => {
  let classify: jest.Mock;
  let engine: RiskScoreEngine;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    classify = jest.fn().mockImplementation((score: number) =>
      Promise.resolve({
        riskLevel: score >= 61 ? 'HIGH' : 'LOW',
        defaultDecision: score >= 61 ? 'MANUAL_REVIEW' : 'ALLOW',
        displayColor: 'green',
      }),
    );

    engine = new RiskScoreEngine({ classify } as never);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sums the impacts of the triggered rules', async () => {
    const result = await engine.calculate([
      triggeredRule('A', 25),
      triggeredRule('B', 30),
    ]);

    expect(result.riskScore).toBe(55);
    expect(result.rawScore).toBe(55);
  });

  it('scores nothing when no rule triggered', async () => {
    const result = await engine.calculate([]);

    expect(result.riskScore).toBe(0);
    expect(classify).toHaveBeenCalledWith(0);
  });

  it('ignores an unusable score impact instead of poisoning the total', async () => {
    const result = await engine.calculate([
      triggeredRule('GOOD', 70),
      triggeredRule('BROKEN', Number.NaN),
    ]);

    // Previously: 70 + NaN = NaN -> no band matched -> LOW / ALLOW.
    expect(result.riskScore).toBe(70);
    expect(result.riskLevel).toBe('HIGH');
    expect(classify).toHaveBeenCalledWith(70);
  });

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['a non-numeric value', 'twenty-five' as unknown as number],
  ])('reports %s as an unusable impact', async (_label, impact) => {
    await engine.calculate([triggeredRule('BROKEN', impact)]);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('BROKEN'));
  });

  it('warns once per rule, not once per transaction', async () => {
    for (let run = 0; run < 20; run += 1) {
      await engine.calculate([triggeredRule('BROKEN', Number.NaN)]);
    }

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('clamps above the configured scale and keeps the raw total', async () => {
    const result = await engine.calculate([
      triggeredRule('A', 100),
      triggeredRule('B', 100),
      triggeredRule('C', 60),
    ]);

    expect(result.riskScore).toBe(100);
    // The clamp would otherwise make three critical rules and one
    // indistinguishable, which is exactly what a review queue needs to order
    // by.
    expect(result.rawScore).toBe(260);
    expect(classify).toHaveBeenCalledWith(100);
  });

  it('clamps below the configured scale', async () => {
    // Nothing in the schema prevents a negative impact, and a negative score
    // matches no configured band.
    const result = await engine.calculate([
      triggeredRule('A', 10),
      triggeredRule('NEGATIVE', -40),
    ]);

    expect(result.riskScore).toBe(0);
    expect(result.rawScore).toBe(-30);
    expect(classify).toHaveBeenCalledWith(0);
  });

  it('classifies on the clamped score, never on the raw total', async () => {
    await engine.calculate([triggeredRule('A', 500)]);

    // Passing 500 to classify would miss every configured band.
    expect(classify).toHaveBeenCalledWith(100);
    expect(classify).not.toHaveBeenCalledWith(500);
  });

  it('passes the classification through unchanged', async () => {
    classify.mockResolvedValue({
      riskLevel: 'CRITICAL',
      defaultDecision: 'BLOCK',
      displayColor: 'red',
    });

    const result = await engine.calculate([triggeredRule('A', 95)]);

    expect(result).toEqual({
      riskScore: 95,
      rawScore: 95,
      riskLevel: 'CRITICAL',
      decision: 'BLOCK',
      displayColor: 'red',
    });
  });
});
