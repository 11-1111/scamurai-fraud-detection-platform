import type { HttpFraudConfigRepository } from "../../infrastructure/repositories/HttpFraudConfigRepository";

export class DisableFraudRule {
  constructor(private readonly repo: HttpFraudConfigRepository) {}

  execute(id: number): Promise<void> {
    return this.repo.disableRule(id);
  }
}
