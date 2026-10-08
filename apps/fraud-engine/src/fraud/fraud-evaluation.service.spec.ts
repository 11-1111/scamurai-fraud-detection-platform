import { FraudEvaluationReason } from '../database/entities/fraud-transaction-evaluation.entity';
import { FraudEvaluationStatus } from '../database/entities/fraud-transaction-evaluation.entity';
import { FraudTransactionEntity } from '../database/entities/fraud-transaction.entity';
import { FeatureSnapshotService } from '../fraud-evaluation/feature-snapshot.service';
import { AlertEngine } from './engines/alert.engine';
import { FeatureEngine } from './engines/feature.engine';
import { GraphEngine } from './engines/graph.engine';
import { PolicyEngine } from './engines/policy.engine';
import { RelationshipEngine } from './engines/relationship.engine';
import { RiskScoreEngine } from './engines/risk-score.engine';
import { RulesEngine } from './engines/rules.engine';
import { FraudEvaluationService } from './fraud-evaluation.service';
import { CalculatedFeature } from './types/fraud.types';

describe('FraudEvaluationService snapshot integration', () => {
  const calculatedFeatures: CalculatedFeature[] = [
    {
      name: 'failedTxnCountPerCardLast15Minutes',
      label: 'Failed transactions per card in last 15 minutes',
      category: 'Velocity',
      value: 3,
      unit: 'transactions',
      windowSeconds: 900,
      calculatedAt: new Date('2026-07-27T00:00:00.000Z'),
    },
  ];

  const featureMap = {
    failedTxnCountPerCardLast15Minutes: 3,
  };

  const transaction = {
    id: 'tx-1',
  } as FraudTransactionEntity;

  let relationshipEngine: { getRelatedIdentifiers: jest.Mock };
  let graphEngine: { getNetwork: jest.Mock };
  let featureEngine: { calculateFeatures: jest.Mock };
  let rulesEngine: { evaluate: jest.Mock };
  let riskScoreEngine: { calculate: jest.Mock };
  let policyEngine: { evaluatePolicy: jest.Mock };
  let featureSnapshotService: {
    startEvaluation: jest.Mock;
    saveFeatureSnapshot: jest.Mock;
    completeEvaluation: jest.Mock;
    failEvaluation: jest.Mock;
    getLatestEvaluation: jest.Mock;
  };
  let alertEngine: { evaluateAndCreateAlert: jest.Mock };
  let service: FraudEvaluationService;
  let callOrder: string[];

  beforeEach(() => {
    callOrder = [];

    relationshipEngine = {
      getRelatedIdentifiers: jest.fn().mockResolvedValue({
        emails: [],
        phones: [],
        ips: [],
        paymentAccounts: [],
        fingerprints: [],
        merchants: [],
        confirmationCodes: [],
        orderTrackingIds: [],
        bankAuthCodes: [],
      }),
    };
    graphEngine = {
      getNetwork: jest.fn().mockResolvedValue({ nodes: [], edges: [] }),
    };
    featureEngine = {
      calculateFeatures: jest.fn().mockImplementation(async () => {
        callOrder.push('calculateFeatures');
        return { calculatedFeatures, featureMap };
      }),
    };
    rulesEngine = {
      evaluate: jest.fn().mockImplementation(async (features) => {
        callOrder.push('evaluateRules');
        expect(features).toBe(featureMap);
        return [
          {
            ruleCode: 'FAILED_CARD_15M',
            ruleName: 'Failed card',
            severity: 'HIGH',
            scoreImpact: 25,
            message: 'triggered',
          },
        ];
      }),
    };
    riskScoreEngine = {
      calculate: jest.fn().mockResolvedValue({
        riskScore: 25,
        riskLevel: 'MEDIUM',
        decision: 'REVIEW',
        displayColor: 'orange',
      }),
    };
    policyEngine = {
      evaluatePolicy: jest.fn().mockResolvedValue({
        finalDecision: 'MANUAL_REVIEW',
        policyActions: [],
      }),
    };
    featureSnapshotService = {
      startEvaluation: jest.fn().mockImplementation(async () => {
        callOrder.push('startEvaluation');
        return {
          id: 'eval-1',
          evaluationVersion: 1,
          fraudTransactionId: transaction.id,
        };
      }),
      saveFeatureSnapshot: jest.fn().mockImplementation(async () => {
        callOrder.push('saveFeatureSnapshot');
        return [];
      }),
      completeEvaluation: jest.fn().mockImplementation(async () => {
        callOrder.push('completeEvaluation');
        return { id: 'eval-1' };
      }),
      failEvaluation: jest.fn().mockImplementation(async () => {
        callOrder.push('failEvaluation');
        return { id: 'eval-1', status: FraudEvaluationStatus.FAILED };
      }),
      getLatestEvaluation: jest.fn().mockResolvedValue(null),
    };
    alertEngine = {
      evaluateAndCreateAlert: jest.fn().mockImplementation(async () => {
        callOrder.push('createAlert');
        return { created: true, alertId: 'alert-1', reason: 'created' };
      }),
    };

    service = new FraudEvaluationService(
      relationshipEngine as unknown as RelationshipEngine,
      graphEngine as unknown as GraphEngine,
      featureEngine as unknown as FeatureEngine,
      rulesEngine as unknown as RulesEngine,
      riskScoreEngine as unknown as RiskScoreEngine,
      policyEngine as unknown as PolicyEngine,
      featureSnapshotService as unknown as FeatureSnapshotService,
      alertEngine as unknown as AlertEngine,
    );
  });

  it('runs a successful persisted evaluation flow', async () => {
    const result = await service.evaluateIdentifier('email', 'a@b.com', {
      transaction,
      persistEvaluation: true,
      createAlert: true,
      rootIdentifier: { type: 'email', value: 'a@b.com' },
      sourceTransactionId: 'source-1',
    });

    expect(featureSnapshotService.startEvaluation).toHaveBeenCalledWith({
      fraudTransactionId: 'tx-1',
      evaluationReason: FraudEvaluationReason.INGESTION,
    });
    expect(featureSnapshotService.saveFeatureSnapshot).toHaveBeenCalledWith({
      evaluationId: 'eval-1',
      fraudTransactionId: 'tx-1',
      calculatedFeatures,
    });
    expect(rulesEngine.evaluate).toHaveBeenCalledWith(featureMap);
    expect(featureSnapshotService.completeEvaluation).toHaveBeenCalledWith({
      evaluationId: 'eval-1',
      riskScore: 25,
      riskLevel: 'MEDIUM',
      policyDecision: 'MANUAL_REVIEW',
    });
    expect(result.alertCreated).toBe(true);
    expect(result.evaluationId).toBe('eval-1');
  });

  it('saves the feature snapshot before rule evaluation', async () => {
    await service.evaluateIdentifier('email', 'a@b.com', {
      transaction,
      persistEvaluation: true,
      createAlert: true,
      rootIdentifier: { type: 'email', value: 'a@b.com' },
      sourceTransactionId: 'source-1',
    });

    expect(callOrder.indexOf('saveFeatureSnapshot')).toBeLessThan(
      callOrder.indexOf('evaluateRules'),
    );
    expect(callOrder).toEqual([
      'startEvaluation',
      'calculateFeatures',
      'saveFeatureSnapshot',
      'evaluateRules',
      'createAlert',
      'completeEvaluation',
    ]);
  });

  it('marks the evaluation FAILED and rethrows the original error', async () => {
    const originalError = new Error('rules exploded');
    rulesEngine.evaluate.mockImplementation(async () => {
      callOrder.push('evaluateRules');
      throw originalError;
    });

    await expect(
      service.evaluateIdentifier('email', 'a@b.com', {
        transaction,
        persistEvaluation: true,
        createAlert: true,
        rootIdentifier: { type: 'email', value: 'a@b.com' },
        sourceTransactionId: 'source-1',
      }),
    ).rejects.toBe(originalError);

    expect(featureSnapshotService.failEvaluation).toHaveBeenCalledWith({
      evaluationId: 'eval-1',
    });
    expect(featureSnapshotService.completeEvaluation).not.toHaveBeenCalled();
    expect(callOrder).toContain('failEvaluation');
  });

  it('uses SYSTEM_RETRY when the latest evaluation previously failed', async () => {
    featureSnapshotService.getLatestEvaluation.mockResolvedValue({
      id: 'eval-0',
      status: FraudEvaluationStatus.FAILED,
    });

    await service.evaluateIdentifier('email', 'a@b.com', {
      transaction,
      persistEvaluation: true,
    });

    expect(featureSnapshotService.startEvaluation).toHaveBeenCalledWith({
      fraudTransactionId: 'tx-1',
      evaluationReason: FraudEvaluationReason.SYSTEM_RETRY,
    });
  });
});
