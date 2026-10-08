import { FraudRuleConfigEntity } from '../../database/entities/fraud-rule-config.entity';
import { RulesEngine } from './rules.engine';

describe('RulesEngine boolean comparisons', () => {
  let ruleConfigRepo: { find: jest.Mock };
  let engine: RulesEngine;

  beforeEach(() => {
    ruleConfigRepo = {
      find: jest.fn(),
    };
    engine = new RulesEngine(ruleConfigRepo as never);
  });

  it('triggers when boolean feature equals true threshold (1)', async () => {
    ruleConfigRepo.find.mockResolvedValue([
      {
        ruleCode: 'DUPLICATE_SUCCESSFUL_ORDER_TRACKING',
        ruleName: 'Duplicate successful Order Tracking ID',
        featureName: 'orderTrackingIdSuccessExists',
        operator: '=',
        thresholdValue: 1,
        severity: 'CRITICAL',
        scoreImpact: 100,
      } as FraudRuleConfigEntity,
    ]);

    const triggered = await engine.evaluate({
      orderTrackingIdSuccessExists: true,
    });

    expect(triggered).toHaveLength(1);
    expect(triggered[0].featureValue).toBe(true);
  });

  it('does not trigger when boolean feature is false against true threshold', async () => {
    ruleConfigRepo.find.mockResolvedValue([
      {
        ruleCode: 'DUPLICATE_SUCCESSFUL_ORDER_TRACKING',
        ruleName: 'Duplicate successful Order Tracking ID',
        featureName: 'orderTrackingIdSuccessExists',
        operator: '=',
        thresholdValue: 1,
        severity: 'CRITICAL',
        scoreImpact: 100,
      } as FraudRuleConfigEntity,
    ]);

    const triggered = await engine.evaluate({
      orderTrackingIdSuccessExists: false,
    });

    expect(triggered).toHaveLength(0);
  });

  it('supports inequality against false (threshold 0)', async () => {
    ruleConfigRepo.find.mockResolvedValue([
      {
        ruleCode: 'NOT_FALSE',
        ruleName: 'Not false',
        featureName: 'orderTrackingIdSuccessExists',
        operator: '!=',
        thresholdValue: 0,
        severity: 'HIGH',
        scoreImpact: 10,
      } as FraudRuleConfigEntity,
    ]);

    const triggered = await engine.evaluate({
      orderTrackingIdSuccessExists: true,
    });

    expect(triggered).toHaveLength(1);
    expect(triggered[0].featureValue).toBe(true);
  });
});
