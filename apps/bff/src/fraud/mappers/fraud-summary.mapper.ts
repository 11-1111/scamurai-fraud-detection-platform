import { FraudProfile } from '../../transactions/dto/fraud-profile.dto';
import { FraudSummaryDto } from '../dto/fraud.dto';

const FLAGGED_DECISIONS = new Set([
  'REVIEW',
  'MANUAL_REVIEW',
  'BLOCK',
  'DENY',
  'HOLD',
]);

function maxSeverity(profile: FraudProfile): string | null {
  const severities = profile.triggeredRules
    .map((rule) => rule.severity)
    .filter(Boolean);

  if (severities.length === 0) {
    return null;
  }

  const order = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  return severities.sort(
    (left, right) => order.indexOf(right) - order.indexOf(left),
  )[0];
}

export function buildFraudSummaryFromProfile(
  profile: FraudProfile | null,
): FraudSummaryDto | null {
  if (profile == null) {
    return null;
  }

  const severity = maxSeverity(profile);
  const isFlagged =
    (profile.triggeredRules?.length ?? 0) > 0 ||
    FLAGGED_DECISIONS.has(profile.decision) ||
    FLAGGED_DECISIONS.has(profile.riskLevel) ||
    profile.riskScore >= 70;

  return {
    isFlagged,
    alertId: null,
    evaluationId: null,
    riskScore: profile.riskScore,
    riskLevel: profile.riskLevel,
    decision: profile.decision,
    severity,
    evaluationStatus: profile.scope ?? null,
  };
}
