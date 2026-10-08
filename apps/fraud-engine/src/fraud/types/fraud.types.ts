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
  | number
  | boolean
  | string
  | Record<string, unknown>
  | unknown[]
  | null;

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
  riskScore: number;
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
