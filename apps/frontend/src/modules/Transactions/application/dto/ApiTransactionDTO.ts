/**
 * DTO for GET /bff/transactions response (BFF contract).
 * Field names match API exactly (camelCase).
 */

// ─── Correlation DTOs ─────────────────────────────────────────────────────────

export interface ApiCorrelatedIdentifierDTO {
  value: string;
  count: number;
}

export interface ApiPageCorrelationsDTO {
  scope?: "CURRENT_PAGE";
  emails?: ApiCorrelatedIdentifierDTO[];
  phones?: ApiCorrelatedIdentifierDTO[];
  ips?: ApiCorrelatedIdentifierDTO[];
  paymentAccounts?: ApiCorrelatedIdentifierDTO[];
  fingerprints?: ApiCorrelatedIdentifierDTO[];
  merchants?: ApiCorrelatedIdentifierDTO[];
  confirmationCodes?: ApiCorrelatedIdentifierDTO[];
  orderTrackingIds?: ApiCorrelatedIdentifierDTO[];
  bankAuthCodes?: ApiCorrelatedIdentifierDTO[];
}

// ─── Fraud Profile DTOs ───────────────────────────────────────────────────────

export interface ApiFraudFeaturesDTO {
  [key: string]: number;
}

export interface ApiFraudRootIdentifierDTO {
  type: string;
  value: string;
}

export interface ApiFraudRelatedIdentifiersDTO {
  emails?: ApiCorrelatedIdentifierDTO[];
  phones?: ApiCorrelatedIdentifierDTO[];
  ips?: ApiCorrelatedIdentifierDTO[];
  paymentAccounts?: ApiCorrelatedIdentifierDTO[];
  fingerprints?: ApiCorrelatedIdentifierDTO[];
  merchants?: ApiCorrelatedIdentifierDTO[];
  confirmationCodes?: ApiCorrelatedIdentifierDTO[];
  orderTrackingIds?: ApiCorrelatedIdentifierDTO[];
  bankAuthCodes?: ApiCorrelatedIdentifierDTO[];
}

export interface ApiFraudGraphNodeDTO {
  id: string;
  label: string;
  type: string;
}

export interface ApiFraudGraphEdgeDTO {
  id: string;
  source: string;
  target: string;
  label: string;
  count?: number;
}

export interface ApiFraudGraphDTO {
  nodes?: ApiFraudGraphNodeDTO[];
  edges?: ApiFraudGraphEdgeDTO[];
}

export interface ApiTriggeredRuleDTO {
  ruleCode: string;
  ruleName: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  scoreImpact: number;
  message: string;
  featureName?: string;
  featureValue?: number;
  operator?: string;
  thresholdValue?: number;
}

export interface ApiPolicyActionDTO {
  policyCode: string;
  policyName: string;
  decision: string;
  actionLabel: string;
  priority: number;
}

export interface ApiFraudProfileDTO {
  scope: "GLOBAL" | string;
  rootIdentifier: ApiFraudRootIdentifierDTO;
  features?: ApiFraudFeaturesDTO;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  defaultDecision?: string;
  decision: "ALLOW" | "REVIEW" | "BLOCK" | "MANUAL_REVIEW" | "ALLOW_WITH_MONITORING" | string;
  displayColor?: string;
  policyActions?: ApiPolicyActionDTO[];
  relatedIdentifiers: ApiFraudRelatedIdentifiersDTO;
  graph: ApiFraudGraphDTO;
  triggeredRules?: ApiTriggeredRuleDTO[];
  reasons?: string[];
}

// ─── Transaction DTOs ─────────────────────────────────────────────────────────

export interface ApiTransactionFraudSummaryDTO {
  isFlagged?: boolean;
  alertId?: string | null;
  evaluationId?: string | null;
  riskScore?: number | null;
  riskLevel?: string | null;
  decision?: string | null;
  severity?: string | null;
  evaluationStatus?: string | null;
}

export interface ApiTransaction {
  date: string;
  merchant: { name: string; email?: string | null };
  amount: {
    full: string;
    currency: string;
    value: string;
    paymentMethod?: string;
  };
  paymentAccount?: string | null;
  status: { text: string; type: string };
  customer: {
    name: string;
    email?: string | null;
    ipAddress?: string | null;
    phone?: string | null;
  };
  confirmationCode?: string | null;
  merchantRef?: string | null;
  viewUrl?: string | null;
  deviceFingerprint?: string | null;
  orderTrackingId?: string | null;
  bankAuthCode?: string | null;
  fraudSummary?: ApiTransactionFraudSummaryDTO | null;
}

// ─── BFF List Response ────────────────────────────────────────────────────────

export interface ApiTransactionsResponse {
  page: number;
  pageSize: number;
  total: number;
  transactions: ApiTransaction[];
  /** New BFF format — page-scoped correlations */
  pageCorrelations?: ApiPageCorrelationsDTO;
  /** Legacy BFF format — kept for backward compatibility */
  correlations?: ApiPageCorrelationsDTO;
  fraudProfile?: ApiFraudProfileDTO | null;
}
