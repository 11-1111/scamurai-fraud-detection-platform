import type { FraudRule, RiskLevel, PolicyRule } from "../../domain/entities/FraudConfig";
import { HttpFraudConfigRepository } from "../../infrastructure/repositories/HttpFraudConfigRepository";

export interface FraudConfigResult {
  rules: FraudRule[];
  riskLevels: RiskLevel[];
  policies: PolicyRule[];
}

export class GetFraudConfig {
  constructor(private readonly repo: HttpFraudConfigRepository) {}

  async execute(): Promise<FraudConfigResult> {
    const [rules, riskLevels, policies] = await Promise.all([
      this.repo.getRules(),
      this.repo.getRiskLevels(),
      this.repo.getPolicies(),
    ]);
    return { rules, riskLevels, policies };
  }
}
