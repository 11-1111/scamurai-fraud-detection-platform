/** Loose BFF shapes — mapped into domain via fraudAlertMapper */

export interface ApiRootIdentifierDTO {
  type?: string;
  value?: string;
}

export interface ApiFraudAlertSummaryDTO {
  id?: string | number;
  fraudTransactionId?: string | null;
  transactionId?: string | null;
  rootIdentifierType?: string;
  rootIdentifierValue?: string;
  rootIdentifier?: ApiRootIdentifierDTO;
  riskScore?: number | string;
  riskLevel?: string;
  severity?: string | null;
  highestSeverity?: string | null;
  decision?: string;
  finalDecision?: string;
  defaultDecision?: string | null;
  status?: string;
  alertStatus?: string;
  merchantName?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  paymentAccount?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  assignedTo?: string | null;
  resolution?: string | null;
}

export interface ApiFeatureSnapshotDTO {
  featureName?: string;
  label?: string;
  description?: string;
  category?: string;
  value?: string | number | boolean | null;
  valueType?: string;
  unit?: string | null;
  windowSeconds?: number | null;
  calculatedAt?: string | null;
}

export interface ApiTriggeredRuleDTO {
  ruleId?: number | null;
  ruleCode?: string;
  ruleName?: string;
  featureName?: string | null;
  operator?: string | null;
  thresholdValue?: number | null;
  actualValue?: number | string | boolean | null;
  featureValue?: number | null;
  scoreImpact?: number | string;
  severity?: string;
  message?: string | null;
}

export interface ApiPolicyActionDTO {
  policyCode?: string;
  policyName?: string;
  decision?: string;
  actionLabel?: string;
  priority?: number | string;
}

export interface ApiGraphDTO {
  nodes?: Array<{ id?: string; label?: string; type?: string }>;
  edges?: Array<{
    id?: string;
    source?: string;
    target?: string;
    label?: string;
    count?: number;
  }>;
}

export interface ApiFraudEvaluationDTO {
  id?: string | number;
  fraudTransactionId?: string | null;
  evaluationVersion?: number | null;
  evaluationReason?: string | null;
  status?: string;
  riskScore?: number | string;
  riskLevel?: string;
  policyDecision?: string;
  decision?: string;
  featureEngineVersion?: string | null;
  rulesEngineVersion?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  features?: ApiFeatureSnapshotDTO[] | Record<string, number | string | boolean | null>;
  triggeredRules?: ApiTriggeredRuleDTO[];
  policyActions?: ApiPolicyActionDTO[];
  reasons?: string[];
  graph?: ApiGraphDTO;
}

export interface ApiFraudAlertNoteDTO {
  id?: number;
  note?: string;
  createdBy?: string | null;
  createdAt?: string;
}

export interface ApiFraudAlertHistoryDTO {
  id?: number;
  actionType?: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  previousAssignee?: string | null;
  newAssignee?: string | null;
  resolution?: string | null;
  comment?: string | null;
  performedBy?: string | null;
  createdAt?: string;
}

export interface ApiFraudAlertDetailDTO extends ApiFraudAlertSummaryDTO {
  transaction?: Record<string, unknown> | null;
  triggeredRules?: ApiTriggeredRuleDTO[];
  policyActions?: ApiPolicyActionDTO[];
  notes?: ApiFraudAlertNoteDTO[];
  history?: ApiFraudAlertHistoryDTO[];
  latestEvaluation?: ApiFraudEvaluationDTO | null;
  features?: ApiFeatureSnapshotDTO[] | Record<string, number | string | boolean | null>;
  relatedIdentifiers?: Record<string, Array<{ value?: string; count?: number }>>;
  graph?: ApiGraphDTO;
  reasons?: string[];
}

export interface ApiFraudAlertListDTO {
  page?: number;
  pageSize?: number;
  total?: number;
  alerts?: ApiFraudAlertSummaryDTO[];
  data?: ApiFraudAlertSummaryDTO[];
  items?: ApiFraudAlertSummaryDTO[];
}
