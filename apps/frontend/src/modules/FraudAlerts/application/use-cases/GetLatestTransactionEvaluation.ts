import type { FraudAlertsRepository } from "../ports/FraudAlertsRepository";
import type { FraudEvaluation } from "../../domain/entities/FraudAlert";

export class GetLatestTransactionEvaluation {
  constructor(private readonly repo: FraudAlertsRepository) {}

  execute(transactionId: string, signal?: AbortSignal): Promise<FraudEvaluation | null> {
    return this.repo.getLatestTransactionEvaluation(transactionId, signal);
  }
}
