import type { FraudAlertsRepository } from "../ports/FraudAlertsRepository";
import type { UpdateFraudAlertInput } from "../../domain/entities/FraudAlert";

export class AssignFraudAlert {
  constructor(private readonly repo: FraudAlertsRepository) {}

  execute(id: string, payload: UpdateFraudAlertInput | string): Promise<unknown> {
    if (typeof payload === "string") {
      return this.repo.updateAlert(id, { assignedTo: payload });
    }
    return this.repo.updateAlert(id, {
      assignedTo: payload.assignedTo,
      comment: payload.comment,
      performedBy: payload.performedBy,
      status: payload.status ?? "ASSIGNED",
    });
  }
}
