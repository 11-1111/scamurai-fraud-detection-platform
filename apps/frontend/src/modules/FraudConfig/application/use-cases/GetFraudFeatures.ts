import type { FraudFeatureConfig } from "../../domain/entities/FraudConfig";
import type { HttpFraudConfigRepository } from "../../infrastructure/repositories/HttpFraudConfigRepository";

export class GetFraudFeatures {
  constructor(private readonly repo: HttpFraudConfigRepository) {}

  execute(): Promise<FraudFeatureConfig[]> {
    return this.repo.getFeatures();
  }
}
