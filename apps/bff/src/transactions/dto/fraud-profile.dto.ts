import { CorrelatedIdentifier } from './correlation.dto';

export interface FraudRootIdentifier {
  type: string;
  value: string;
}

export type FraudFeatures = Record<string, number>;

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
