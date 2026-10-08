import type { FraudRuleConfig, UpdateFraudRulePayload } from "../../domain/entities/FraudConfig";
import type { HttpFraudConfigRepository } from "../../infrastructure/repositories/HttpFraudConfigRepository";

export class UpdateFraudRule {
  constructor(private readonly repo: HttpFraudConfigRepository) {}

  execute(id: number, payload: UpdateFraudRulePayload): Promise<FraudRuleConfig> {
    return this.repo.updateRule(id, payload);
  }
}
