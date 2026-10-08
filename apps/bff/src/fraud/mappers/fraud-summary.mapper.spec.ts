import { buildFraudSummaryFromProfile } from './fraud-summary.mapper';
import { FraudProfile } from '../../transactions/dto/fraud-profile.dto';

describe('buildFraudSummaryFromProfile', () => {
  it('returns null when profile is null', () => {
    expect(buildFraudSummaryFromProfile(null)).toBeNull();
  });

  it('maps profile risk fields without extra requests', () => {
    const profile: FraudProfile = {
      scope: 'GLOBAL',
      rootIdentifier: { type: 'email', value: 'a@example.com' },
      features: { uniqueIpsLinked: 6 },
      riskScore: 87,
      riskLevel: 'HIGH',
      decision: 'MANUAL_REVIEW',
      policyActions: [],
      relatedIdentifiers: {
        emails: [],
        phones: [],
        ips: [],
        paymentAccounts: [],
        fingerprints: [],
        merchants: [],
        confirmationCodes: [],
        orderTrackingIds: [],
        bankAuthCodes: [],
      },
      graph: { nodes: [], edges: [] },
      triggeredRules: [
        {
          ruleCode: 'EMAIL_MANY_IPS',
          ruleName: 'Email linked to many IPs',
          severity: 'HIGH',
          scoreImpact: 25,
          message: 'Triggered',
        },
      ],
      reasons: ['High IP diversity'],
    };

    expect(buildFraudSummaryFromProfile(profile)).toEqual({
      isFlagged: true,
      alertId: null,
      evaluationId: null,
      riskScore: 87,
      riskLevel: 'HIGH',
      decision: 'MANUAL_REVIEW',
      severity: 'HIGH',
      evaluationStatus: 'GLOBAL',
    });
  });
});
