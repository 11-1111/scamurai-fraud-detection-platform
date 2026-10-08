export type AlertStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'CLOSED'
  | 'DISMISSED';

export type AlertResolution =
  | 'CONFIRMED_FRAUD'
  | 'FALSE_POSITIVE'
  | 'DUPLICATE'
  | 'INSUFFICIENT_EVIDENCE'
  | 'CUSTOMER_CONFIRMED'
  | 'MERCHANT_CONFIRMED';

export interface FraudAlertSummary {
  id: string;
  transactionId?: string | null;
  rootIdentifier: {
    type: string;
    value: string;
  };
  riskScore: number;
  riskLevel: string;
  defaultDecision?: string | null;
  finalDecision: string;
  highestSeverity?: string | null;
  alertStatus: string;
  resolution?: string | null;
  assignedTo?: string | null;
  createdAt: Date;
  updatedAt?: Date | null;
}

export interface FraudAlertDetail extends FraudAlertSummary {
  features: Record<string, number>;
  relatedIdentifiers: unknown;
  graph: unknown;
  triggeredRules: unknown[];
  policyActions: unknown[];
  reasons: string[];
  notes: unknown[];
  history: Array<{
    id: number;
    actionType: string;
    previousStatus?: string | null;
    newStatus?: string | null;
    previousAssignee?: string | null;
    newAssignee?: string | null;
    resolution?: string | null;
    comment?: string | null;
    performedBy?: string | null;
    createdAt: Date;
  }>;
}

export interface AlertListQuery {
  status?: string;
  riskLevel?: string;
  decision?: string;
  assignedTo?: string;
  rootIdentifierType?: string;
  rootIdentifierValue?: string;
  page?: number;
  pageSize?: number;
}
