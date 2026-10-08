import {
  mapAlertDetail,
  mapAlertsList,
  mapTriggeredRule,
} from './fraud.mapper';
import {
  UpstreamFraudAlertDetail,
  UpstreamFraudAlertsListResponse,
} from '../dto/upstream-fraud.types';

describe('fraud.mapper', () => {
  it('maps alert list summaries using upstream field names', () => {
    const upstream: UpstreamFraudAlertsListResponse = {
      page: 1,
      pageSize: 20,
      total: 1,
      alerts: [
        {
          id: 'alert-1',
          transactionId: 'tx-1',
          rootIdentifier: { type: 'email', value: 'a@example.com' },
          riskScore: 80,
          riskLevel: 'HIGH',
          finalDecision: 'MANUAL_REVIEW',
          highestSeverity: 'HIGH',
          alertStatus: 'OPEN',
          createdAt: '2026-08-03T10:00:00.000Z',
          updatedAt: '2026-08-03T10:05:00.000Z',
        },
      ],
    };

    expect(mapAlertsList(upstream)).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
      alerts: [
        expect.objectContaining({
          id: 'alert-1',
          fraudTransactionId: 'tx-1',
          rootIdentifierType: 'email',
          rootIdentifierValue: 'a@example.com',
          severity: 'HIGH',
          decision: 'MANUAL_REVIEW',
          status: 'OPEN',
        }),
      ],
    });
  });

  it('normalizes timezone-less upstream alert timestamps to ISO UTC', () => {
    const upstream: UpstreamFraudAlertsListResponse = {
      page: 1,
      pageSize: 20,
      total: 1,
      alerts: [
        {
          id: 'alert-1',
          transactionId: 'tx-1',
          rootIdentifier: { type: 'email', value: 'a@example.com' },
          riskScore: 80,
          riskLevel: 'HIGH',
          finalDecision: 'MANUAL_REVIEW',
          highestSeverity: 'HIGH',
          alertStatus: 'OPEN',
          createdAt: '2026/08/09 14:41:17',
          updatedAt: '2026/08/09 15:00:00',
        },
      ],
    };

    expect(mapAlertsList(upstream).alerts[0].createdAt).toBe(
      '2026-08-09T14:41:17.000Z',
    );
    expect(mapAlertsList(upstream).alerts[0].updatedAt).toBe(
      '2026-08-09T15:00:00.000Z',
    );
  });

  it('preserves graph nodes and edges in alert detail', () => {
    const upstream: UpstreamFraudAlertDetail = {
      id: 'alert-1',
      transactionId: 'tx-1',
      rootIdentifier: { type: 'email', value: 'a@example.com' },
      riskScore: 80,
      riskLevel: 'HIGH',
      finalDecision: 'MANUAL_REVIEW',
      alertStatus: 'OPEN',
      createdAt: '2026-08-03T10:00:00.000Z',
      features: { uniqueIpsLinked: 6 },
      relatedIdentifiers: {},
      graph: {
        nodes: [{ id: 'n1', label: 'a@example.com', type: 'email' }],
        edges: [{ id: 'e1', source: 'n1', target: 'n2', label: 'linked' }],
      },
      triggeredRules: [],
      policyActions: [],
      reasons: [],
      notes: [],
      history: [],
    };

    expect(mapAlertDetail(upstream).graph).toEqual({
      nodes: [{ id: 'n1', label: 'a@example.com', type: 'email' }],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', label: 'linked' }],
    });
  });

  it('preserves numeric and boolean feature values via triggered rules', () => {
    expect(
      mapTriggeredRule({
        ruleId: 7,
        ruleCode: 'EMAIL_MANY_IPS',
        ruleName: 'Email linked to many IPs',
        featureName: 'uniqueIpsLinked',
        operator: '>',
        thresholdValue: 5,
        actualValue: 6,
        scoreImpact: 25,
        severity: 'HIGH',
        message: 'Triggered',
      }),
    ).toEqual({
      ruleId: 7,
      ruleCode: 'EMAIL_MANY_IPS',
      ruleName: 'Email linked to many IPs',
      featureName: 'uniqueIpsLinked',
      operator: '>',
      thresholdValue: 5,
      actualValue: 6,
      scoreImpact: 25,
      severity: 'HIGH',
      reason: 'Triggered',
    });
  });
});
