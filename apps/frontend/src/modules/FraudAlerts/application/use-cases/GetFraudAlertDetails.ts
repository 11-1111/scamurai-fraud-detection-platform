import type { FraudAlertsRepository } from "../ports/FraudAlertsRepository";
import type { FraudAlertDetail } from "../../domain/entities/FraudAlert";

export class GetFraudAlertDetails {
  constructor(private readonly repo: FraudAlertsRepository) {}

  execute(alertId: string, signal?: AbortSignal): Promise<FraudAlertDetail> {
    return this.repo.getAlert(alertId, signal);
  }
}
