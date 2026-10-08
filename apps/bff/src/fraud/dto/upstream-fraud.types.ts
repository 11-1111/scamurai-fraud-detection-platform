export interface UpstreamRootIdentifier {
  type: string;
  value: string;
}

export interface UpstreamFraudAlertSummary {
  id: string;
  transactionId?: string | null;
  rootIdentifier: UpstreamRootIdentifier;
  riskScore: number;
  riskLevel: string;
  defaultDecision?: string | null;
  finalDecision: string;
  highestSeverity?: string | null;
  alertStatus: string;
  resolution?: string | null;
  assignedTo?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface UpstreamFraudAlertNote {
  id: number;
  alertId: string;
  note: string;
  createdBy?: string | null;
  createdAt: string;
}

export interface UpstreamFraudAlertHistoryItem {
  id: number;
  actionType: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  previousAssignee?: string | null;
  newAssignee?: string | null;
  resolution?: string | null;
  comment?: string | null;
  performedBy?: string | null;
  createdAt: string;
}

export interface UpstreamFraudTriggeredRule {
  id?: number;
  ruleId?: number;
  ruleCode?: string;
  ruleName?: string;
  featureName?: string;
  operator?: string;
  thresholdValue?: number;
  actualValue?: number;
  featureValue?: number;
  scoreImpact?: number;
  severity?: string;
  message?: string;
  reason?: string;
}

export interface UpstreamFraudPolicyAction {
  policyCode?: string;
  policyName?: string;
  decision?: string;
  actionLabel?: string;
  priority?: number;
}

export interface UpstreamFraudAlertDetail extends UpstreamFraudAlertSummary {
  features: Record<string, number>;
  relatedIdentifiers: unknown;
  graph: unknown;
  triggeredRules: UpstreamFraudTriggeredRule[];
  policyActions: UpstreamFraudPolicyAction[];
  reasons: string[];
  notes: UpstreamFraudAlertNote[];
  history: UpstreamFraudAlertHistoryItem[];
}

export interface UpstreamFraudAlertsListResponse {
  page: number;
  pageSize: number;
  total: number;
  alerts: UpstreamFraudAlertSummary[];
}

export interface UpstreamFraudRule {
  id: number;
  ruleCode: string;
  ruleName: string;
  description?: string | null;
  featureName: string;
  operator: string;
  thresholdValue: number;
  severity: string;
  scoreImpact: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface UpstreamFraudFeatureCatalogItem {
  featureName: string;
  label: string;
  description: string;
  category: string;
  dataType: 'number' | 'boolean';
  supportedOperators: string[];
  unit?: string;
  windowSeconds?: number;
  version: string;
}

export interface UpstreamFraudRiskLevel {
  id: number;
  levelCode?: string;
  levelName?: string;
  minScore: number;
  maxScore?: number | null;
  defaultDecision?: string | null;
  displayColor?: string | null;
  priority?: number | null;
  isEnabled: boolean;
}

export interface UpstreamFraudPolicy {
  id: number;
  policyCode: string;
  policyName: string;
  riskLevel?: string | null;
  minScore?: number | null;
  maxScore?: number | null;
  decision: string;
  actionLabel?: string | null;
  priority?: number | null;
  isEnabled: boolean;
  featureName?: string | null;
  operator?: string | null;
  thresholdValue?: number | null;
}

export interface UpstreamIngestionSyncResponse {
  message: string;
  result: unknown;
}
