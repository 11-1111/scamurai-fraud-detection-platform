import type { FraudAlertsRepository } from "../ports/FraudAlertsRepository";
import type { FraudAlertFilters, FraudAlertListResponse } from "../../domain/entities/FraudAlert";

export class ListFraudAlerts {
  constructor(private readonly repo: FraudAlertsRepository) {}

  execute(filters?: FraudAlertFilters, signal?: AbortSignal): Promise<FraudAlertListResponse> {
    return this.repo.listAlerts(filters, signal);
  }
}
