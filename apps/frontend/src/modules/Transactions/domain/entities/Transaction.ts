export type TransactionStatusType = "danger" | "success" | "warning" | "info";

export interface TransactionFraudSummary {
  isFlagged: boolean;
  alertId: string | null;
  evaluationId: string | null;
  riskScore: number | null;
  riskLevel: string | null;
  decision: string | null;
  severity: string | null;
  evaluationStatus: string | null;
}

export interface Transaction {
  date: string;
  merchantName: string;
  merchantEmail: string;
  amountFull: string;
  currency: string;
  amountValue: number;
  paymentMethod: string;
  paymentAccount: string;
  statusText: string;
  statusType: TransactionStatusType;
  customerName: string;
  customerEmail: string;
  customerIp: string;
  confirmationCode: string;
  merchantRef: string;
  viewUrl: string;
  orderTrackingId?: string;
  orderNumber?: string;
  phoneNumber?: string;
  bankAuthCode?: string;
  deviceFingerprint?: string;
  /** Optional fraud summary from GET /bff/transactions (no per-row fraud calls). */
  fraudSummary?: TransactionFraudSummary;
}

// ─── Correlation domain types ─────────────────────────────────────────────────

export interface CorrelatedIdentifier {
  value: string;
  count: number;
}

export interface PageCorrelations {
  scope: "CURRENT_PAGE";
  emails: CorrelatedIdentifier[];
  phones: CorrelatedIdentifier[];
  ips: CorrelatedIdentifier[];
  paymentAccounts: CorrelatedIdentifier[];
  fingerprints: CorrelatedIdentifier[];
  merchants: CorrelatedIdentifier[];
  confirmationCodes: CorrelatedIdentifier[];
  orderTrackingIds: CorrelatedIdentifier[];
  bankAuthCodes: CorrelatedIdentifier[];
}

// ─── Fraud profile domain types ───────────────────────────────────────────────

export interface FraudFeatures {
  [key: string]: number;
}

export interface FraudRootIdentifier {
  type: string;
  value: string;
}

export interface FraudRelatedIdentifiers {
  emails: CorrelatedIdentifier[];
  phones: CorrelatedIdentifier[];
  ips: CorrelatedIdentifier[];
  paymentAccounts: CorrelatedIdentifier[];
  fingerprints: CorrelatedIdentifier[];
  merchants: CorrelatedIdentifier[];
  confirmationCodes: CorrelatedIdentifier[];
  orderTrackingIds: CorrelatedIdentifier[];
  bankAuthCodes: CorrelatedIdentifier[];
}

export interface FraudGraphNode {
  id: string;
  label: string;
  type: string;
}

export interface FraudGraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  count?: number;
}

export interface FraudGraph {
  nodes: FraudGraphNode[];
  edges: FraudGraphEdge[];
}

export interface TriggeredRule {
  ruleCode: string;
  ruleName: string;
  severity: string;
  scoreImpact: number;
  message: string;
  featureName?: string;
  featureValue?: number;
  operator?: string;
  thresholdValue?: number;
}

export interface PolicyAction {
  policyCode: string;
  policyName: string;
  decision: string;
  actionLabel: string;
  priority: number;
}

export interface FraudProfile {
  scope: string;
  rootIdentifier: FraudRootIdentifier;
  features: FraudFeatures;
  riskScore: number;
  riskLevel: string;
  defaultDecision?: string;
  decision: string;
  displayColor?: string;
  policyActions: PolicyAction[];
  relatedIdentifiers: FraudRelatedIdentifiers;
  graph: FraudGraph;
  triggeredRules: TriggeredRule[];
  reasons: string[];
}
