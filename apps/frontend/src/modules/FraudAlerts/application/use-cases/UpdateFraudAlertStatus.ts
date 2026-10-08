import type { FraudAlertsRepository } from "../ports/FraudAlertsRepository";
import type { UpdateFraudAlertInput } from "../../domain/entities/FraudAlert";

export class UpdateFraudAlertStatus {
  constructor(private readonly repo: FraudAlertsRepository) {}

  execute(id: string, payload: UpdateFraudAlertInput | string): Promise<unknown> {
    if (typeof payload === "string") {
      return this.repo.updateAlert(id, { status: payload });
    }
    return this.repo.updateAlert(id, payload);
  }
}
