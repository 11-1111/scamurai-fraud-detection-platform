export interface FraudAlertListResponse {
  data: FraudAlert[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FraudAlertStatsResponse {
  total: number;
  open: number;
  inReview: number;
  resolved: number;
  byRiskLevel: Record<string, number>;
}

export interface FraudAlert {
  id: string;
  status: string;
  riskLevel: string;
  riskScore: number;
  decision: string;
  assignedTo?: string;
  rootIdentifierType: string;
  rootIdentifierValue: string;
  createdAt: string;
  updatedAt: string;
  notes?: FraudAlertNote[];
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

export interface FraudAlertDetail extends FraudAlert {
  history: FraudAlertHistoryItem[];
}

export interface FraudAlertNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}
