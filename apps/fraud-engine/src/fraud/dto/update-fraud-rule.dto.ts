export class UpdateFraudRuleDto {
  ruleName?: string;
  description?: string;
  featureName?: string;
  operator?: string;
  thresholdValue?: number;
  severity?: string;
  scoreImpact?: number;
  isEnabled?: boolean;
}
