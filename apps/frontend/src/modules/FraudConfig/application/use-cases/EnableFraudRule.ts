import type { HttpFraudConfigRepository } from "../../infrastructure/repositories/HttpFraudConfigRepository";

export class EnableFraudRule {
  constructor(private readonly repo: HttpFraudConfigRepository) {}

  execute(id: number): Promise<void> {
    return this.repo.enableRule(id);
  }
}
