import type { FraudAlertsRepository } from "../ports/FraudAlertsRepository";
import type { FraudAlertStats } from "../../domain/entities/FraudAlert";

export class GetFraudAlertStats {
  constructor(private readonly repo: FraudAlertsRepository) {}

  execute(signal?: AbortSignal): Promise<FraudAlertStats> {
    return this.repo.getStats(signal);
  }
}
