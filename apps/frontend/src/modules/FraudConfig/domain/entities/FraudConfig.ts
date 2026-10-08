export interface FraudFeatureConfig {
  featureName: string;
  label: string;
  description: string;
  category: string;
  dataType: "number" | "boolean" | string;
  supportedOperators: string[];
  unit?: string | null;
  windowSeconds?: number | null;
  version?: string | null;
}

export interface FraudRuleConfig {
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
  createdAt?: string;
  updatedAt?: string | null;
}

export interface CreateFraudRulePayload {
  ruleCode: string;
  ruleName: string;
  description?: string;
  featureName: string;
  operator: string;
  thresholdValue: number;
  severity: string;
  scoreImpact: number;
  isEnabled: boolean;
}

export interface UpdateFraudRulePayload {
  ruleName?: string;
  description?: string;
  featureName?: string;
  operator?: string;
  thresholdValue?: number;
  severity?: string;
  scoreImpact?: number;
  isEnabled?: boolean;
}

/** List/table view — normalised from BFF (`enabled` alias for `isEnabled`). */
export interface FraudRule {
  id: number;
  ruleCode: string;
  ruleName: string;
  description?: string | null;
  featureName: string;
  operator: string;
  thresholdValue: number;
  severity: string;
  scoreImpact: number;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface RiskLevel {
  levelCode: string;
  minScore: number;
  maxScore: number;
  defaultDecision: string;
  displayColor: string;
  priority: number;
  enabled: boolean;
}

export interface PolicyRule {
  policyCode: string;
  policyName: string;
  conditionFeature: string;
  operator: string;
  conditionValue: number;
  minScore?: number;
  maxScore?: number;
  riskLevel?: string;
  decision: string;
  actionLabel: string;
  priority: number;
  enabled: boolean;
}

export interface FraudConfig {
  rules: FraudRule[];
  riskLevels: RiskLevel[];
  policies: PolicyRule[];
}

export function toFraudRuleConfig(rule: FraudRule): FraudRuleConfig {
  return {
    id: rule.id,
    ruleCode: rule.ruleCode,
    ruleName: rule.ruleName,
    description: rule.description,
    featureName: rule.featureName,
    operator: rule.operator,
    thresholdValue: rule.thresholdValue,
    severity: rule.severity,
    scoreImpact: rule.scoreImpact,
    isEnabled: rule.enabled,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}
