import type { CreateFraudRulePayload, FraudRuleConfig } from "../../domain/entities/FraudConfig";
import type { HttpFraudConfigRepository } from "../../infrastructure/repositories/HttpFraudConfigRepository";

export class CreateFraudRule {
  constructor(private readonly repo: HttpFraudConfigRepository) {}

  execute(payload: CreateFraudRulePayload): Promise<FraudRuleConfig> {
    return this.repo.createRule(payload);
  }
}
