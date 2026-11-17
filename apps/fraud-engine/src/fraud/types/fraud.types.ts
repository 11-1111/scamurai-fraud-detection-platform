export type IdentifierType =
  | 'email'
  | 'phone'
  | 'ip'
  | 'payment_account'
  | 'fingerprint'
  | 'merchant_email'
  | 'merchant_name'
  | 'confirmation_code'
  | 'order_tracking_id'
  | 'bank_auth_code';

export interface RelatedIdentifier {
  value: string;
  count: number;
}

export interface RelatedIdentifiers {
  emails: RelatedIdentifier[];
  phones: RelatedIdentifier[];
  ips: RelatedIdentifier[];
  paymentAccounts: RelatedIdentifier[];
  fingerprints: RelatedIdentifier[];
  merchants: RelatedIdentifier[];
  confirmationCodes: RelatedIdentifier[];
  orderTrackingIds: RelatedIdentifier[];
  bankAuthCodes: RelatedIdentifier[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  count?: number;
}

export interface FraudGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /*
   * The network was larger than the traversal budget, so this is a slice of
   * it. An analyst reading a partial network as if it were the whole one can
   * conclude the opposite of the truth -- that a ring ends where the budget
   * ran out -- so the caller is told rather than left to guess.
   */
  truncated?: boolean;
}

export interface TriggeredRule {
  ruleCode: string;
  ruleName: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scoreImpact: number;
  message: string;
  featureName?: string;
  featureValue?: number | boolean;
  operator?: string;
  thresholdValue?: number;
}

export type FraudFeatureValue =
  number | boolean | string | Record<string, unknown> | unknown[] | null;

export interface CalculatedFeature {
  name: string;
  label: string;
  description?: string;
  category: string;
  value: FraudFeatureValue;
  unit?: string;
  windowSeconds?: number;
  calculatedAt: Date;
}

export interface FeatureCalculationResult {
  calculatedFeatures: CalculatedFeature[];
  featureMap: Record<string, FraudFeatureValue>;
}

/** Flat feature map used by rules and policy engines. */
export type FraudFeatures = Record<string, FraudFeatureValue>;

export interface PolicyAction {
  policyCode: string;
  policyName: string;
  decision: string;
  actionLabel: string;
  priority: number;
}

export interface RiskScoreResult {
  /** Clamped to the scale the configured risk levels are expressed against. */
  riskScore: number;
  /*
   * The unclamped sum. Classification uses riskScore, so bands behave
   * exactly as configured, but the clamp hides how much evidence there was:
   * one critical rule and ten both score 100. A review queue can rank on
   * this without changing any threshold.
   */
  rawScore: number;
  riskLevel: string;
  decision: string;
  displayColor?: string;
}

export const SUPPORTED_IDENTIFIER_TYPES: IdentifierType[] = [
  'email',
  'phone',
  'ip',
  'payment_account',
  'fingerprint',
  'merchant_email',
  'merchant_name',
  'confirmation_code',
  'order_tracking_id',
  'bank_auth_code',
];
