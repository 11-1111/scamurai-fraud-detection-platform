import type { FraudAlertsRepository } from "../ports/FraudAlertsRepository";
import type { UpdateFraudAlertInput } from "../../domain/entities/FraudAlert";

export class ResolveFraudAlert {
  constructor(private readonly repo: FraudAlertsRepository) {}

  execute(id: string, payload: UpdateFraudAlertInput): Promise<unknown> {
    return this.repo.updateAlert(id, {
      ...payload,
      status: payload.status ?? "RESOLVED",
    });
  }
}
