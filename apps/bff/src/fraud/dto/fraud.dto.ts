export interface FraudAlertSummaryDto {
  id: string;
  fraudTransactionId: string | null;
  rootIdentifierType: string;
  rootIdentifierValue: string;
  riskScore: number;
  riskLevel: string;
  severity: string | null;
  decision: string;
  status: string;
  merchantName: string | null;
  customerName: string | null;
  customerEmail: string | null;
  paymentAccount: string | null;
  createdAt: string;
  updatedAt: string | null;
  assignedTo: string | null;
}

export interface FraudTriggeredRuleDto {
  ruleId: number | null;
  ruleCode: string;
  ruleName: string;
  featureName: string | null;
  operator: string | null;
  thresholdValue: number | null;
  actualValue: number | null;
  scoreImpact: number | null;
  severity: string | null;
  reason: string | null;
}

export interface FraudPolicyActionDto {
  policyCode: string;
  policyName: string;
  decision: string;
  actionLabel: string;
  priority: number | null;
}

export interface FraudAlertNoteDto {
  id: number;
  note: string;
  createdBy: string | null;
  createdAt: string;
}

export interface FraudAlertHistoryItemDto {
  id: number;
  actionType: string;
  previousStatus: string | null;
  newStatus: string | null;
  previousAssignee: string | null;
  newAssignee: string | null;
  resolution: string | null;
  comment: string | null;
  performedBy: string | null;
  createdAt: string;
}

export interface FraudGraphNodeDto {
  id: string;
  label: string;
  type: string;
}

export interface FraudGraphEdgeDto {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface FraudGraphDto {
  nodes: FraudGraphNodeDto[];
  edges: FraudGraphEdgeDto[];
}

export interface FraudAlertDetailDto extends FraudAlertSummaryDto {
  defaultDecision: string | null;
  resolution: string | null;
  features: Record<string, number>;
  relatedIdentifiers: unknown;
  graph: FraudGraphDto;
  triggeredRules: FraudTriggeredRuleDto[];
  policyActions: FraudPolicyActionDto[];
  reasons: string[];
  notes: FraudAlertNoteDto[];
  history: FraudAlertHistoryItemDto[];
}

export interface FraudAlertsListResponseDto {
  page: number;
  pageSize: number;
  total: number;
  alerts: FraudAlertSummaryDto[];
}

export interface FraudAlertDetailResponseDto {
  alert: FraudAlertDetailDto;
}

export interface FraudFeatureSnapshotDto {
  id: string | null;
  featureName: string;
  featureLabel: string | null;
  featureDescription: string | null;
  featureCategory: string | null;
  valueType: string | null;
  numericValue: number | null;
  booleanValue: boolean | null;
  stringValue: string | null;
  jsonValue: unknown;
  value: number | boolean | string | null;
  unit: string | null;
  windowSeconds: number | null;
  calculatedAt: string | null;
}

export interface FraudEvaluationDto {
  id: string | null;
  fraudTransactionId: string | null;
  evaluationVersion: string | null;
  evaluationReason: string | null;
  status: string | null;
  riskScore: number | null;
  riskLevel: string | null;
  policyDecision: string | null;
  featureEngineVersion: string | null;
  rulesEngineVersion: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  features: FraudFeatureSnapshotDto[];
  triggeredRules: FraudTriggeredRuleDto[];
  policyActions: FraudPolicyActionDto[];
  reasons: string[];
  graph: FraudGraphDto | null;
}

export interface FraudEvaluationDetailResponseDto {
  evaluation: FraudEvaluationDto;
}

export interface FraudFeatureCatalogItemDto {
  featureName: string;
  label: string;
  description: string;
  category: string;
  dataType: string;
  supportedOperators: string[];
  unit: string | null;
  windowSeconds: number | null;
  version: string;
}

export interface FraudRuleDto {
  id: number;
  ruleCode: string;
  ruleName: string;
  description: string | null;
  featureName: string;
  operator: string;
  thresholdValue: number;
  scoreImpact: number;
  severity: string;
  message: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface FraudRiskLevelDto {
  id: number;
  code: string;
  name: string;
  minScore: number;
  maxScore: number | null;
  defaultDecision: string | null;
  displayColor: string | null;
  priority: number | null;
  isEnabled: boolean;
}

export interface FraudPolicyDto {
  id: number;
  policyCode: string;
  policyName: string;
  riskLevel: string | null;
  minScore: number | null;
  maxScore: number | null;
  decision: string;
  actionLabel: string | null;
  priority: number | null;
  isEnabled: boolean;
  featureName: string | null;
  operator: string | null;
  thresholdValue: number | null;
}

export interface FraudSummaryDto {
  isFlagged: boolean;
  alertId: string | null;
  evaluationId: string | null;
  riskScore: number | null;
  riskLevel: string | null;
  decision: string | null;
  severity: string | null;
  evaluationStatus: string | null;
}

export interface FraudIngestionSyncResponseDto {
  message: string;
  result: unknown;
}
