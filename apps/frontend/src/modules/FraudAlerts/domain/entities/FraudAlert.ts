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

export interface FeatureSnapshot {
  featureName: string;
  label: string;
  description: string;
  category: string;
  value: string | number | boolean | null;
  valueType: string;
  unit?: string | null;
  windowSeconds?: number | null;
  calculatedAt?: string | null;
}

export interface TriggeredRule {
  ruleId?: number | null;
  ruleCode: string;
  ruleName: string;
  featureName?: string | null;
  operator?: string | null;
  thresholdValue?: number | null;
  actualValue?: number | string | boolean | null;
  scoreImpact: number;
  severity: string;
  message?: string | null;
}

export interface PolicyAction {
  policyCode: string;
  policyName: string;
  decision: string;
  actionLabel: string;
  priority: number;
}

export interface FraudEvaluation {
  id: string;
  fraudTransactionId?: string | null;
  evaluationVersion?: number | null;
  evaluationReason?: string | null;
  status: string;
  riskScore: number;
  riskLevel: string;
  policyDecision: string;
  featureEngineVersion?: string | null;
  rulesEngineVersion?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  features: FeatureSnapshot[];
  /** Raw key/value map when BFF returns features as object instead of snapshots */
  featureMap: Record<string, number | string | boolean | null>;
  triggeredRules: TriggeredRule[];
  policyActions: PolicyAction[];
  reasons: string[];
  graph: FraudGraph;
}

export interface FraudAlertNote {
  id: number;
  note: string;
  createdBy?: string | null;
  createdAt: string;
}

export interface FraudAlertHistoryItem {
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

export interface FraudAlertSummary {
  id: string;
  fraudTransactionId?: string | null;
  rootIdentifierType: string;
  rootIdentifierValue: string;
  riskScore: number;
  riskLevel: string;
  severity?: string | null;
  decision: string;
  status: string;
  merchantName?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  paymentAccount?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  assignedTo?: string | null;
  resolution?: string | null;
  /** Convenience aliases used by existing UI */
  transactionId?: string | null;
  finalDecision: string;
  alertStatus: string;
  highestSeverity?: string | null;
  defaultDecision?: string | null;
  rootIdentifier: { type: string; value: string };
}

export interface FraudAlertTransactionInfo {
  merchantName?: string | null;
  merchantEmail?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  phone?: string | null;
  ip?: string | null;
  paymentAccount?: string | null;
  deviceFingerprint?: string | null;
  merchantRef?: string | null;
  orderTrackingId?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  transactionStatus?: string | null;
}

export interface FraudAlertDetail extends FraudAlertSummary {
  transaction?: FraudAlertTransactionInfo | null;
  triggeredRules: TriggeredRule[];
  policyActions: PolicyAction[];
  notes: FraudAlertNote[];
  history: FraudAlertHistoryItem[];
  latestEvaluation: FraudEvaluation | null;
  features: FeatureSnapshot[];
  featureMap: Record<string, number | string | boolean | null>;
  relatedIdentifiers: Record<string, Array<{ value: string; count: number }>>;
  graph: FraudGraph;
  reasons: string[];
}

export interface FraudAlertListResponse {
  page: number;
  pageSize: number;
  total: number;
  alerts: FraudAlertSummary[];
}

export interface FraudAlertStats {
  totalOpen: number;
  totalAssigned: number;
  totalUnderReview: number;
  totalResolved: number;
  totalCritical: number;
  totalHigh: number;
  byDecision: Array<{ decision: string; count: number }>;
  byRiskLevel: Array<{ riskLevel: string; count: number }>;
}

export interface FraudAlertFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  riskLevel?: string;
  decision?: string;
  severity?: string;
  assignedTo?: string;
  search?: string;
  rootIdentifierType?: string;
  rootIdentifierValue?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface UpdateFraudAlertInput {
  status?: string;
  assignedTo?: string;
  resolution?: string;
  comment?: string;
  note?: string;
  performedBy?: string;
  resolvedBy?: string;
}

export interface AddFraudAlertNoteInput {
  note: string;
  createdBy?: string;
}

/** @deprecated Prefer UpdateFraudAlertInput */
export type ResolveFraudAlertPayload = UpdateFraudAlertInput;
/** @deprecated Prefer UpdateFraudAlertInput */
export type AssignFraudAlertPayload = UpdateFraudAlertInput;
/** @deprecated Prefer UpdateFraudAlertInput */
export type UpdateFraudAlertStatusPayload = UpdateFraudAlertInput;
/** @deprecated Prefer AddFraudAlertNoteInput */
export type AddFraudAlertNotePayload = AddFraudAlertNoteInput;

/** Legacy aliases for existing panels */
export type FraudAlertTriggeredRule = TriggeredRule;
export type FraudAlertPolicyAction = PolicyAction;
export type FraudAlertGraph = FraudGraph;
export type FraudAlertGraphNode = GraphNode;
export type FraudAlertGraphEdge = GraphEdge;
export type RootIdentifier = { type: string; value: string };
export type CorrelatedIdentifierEntry = { value: string; count: number };
