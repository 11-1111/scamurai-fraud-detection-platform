import type { FraudAlertsRepository } from "../ports/FraudAlertsRepository";
import type { AddFraudAlertNoteInput } from "../../domain/entities/FraudAlert";

export class AddFraudAlertNote {
  constructor(private readonly repo: FraudAlertsRepository) {}

  execute(id: string, payload: AddFraudAlertNoteInput): Promise<unknown> {
    return this.repo.addAlertNote(id, payload);
  }
}
