import type { FraudAlertsRepository } from "../ports/FraudAlertsRepository";
import type { FraudEvaluation } from "../../domain/entities/FraudAlert";

export class GetTransactionEvaluations {
  constructor(private readonly repo: FraudAlertsRepository) {}

  execute(transactionId: string, signal?: AbortSignal): Promise<FraudEvaluation[]> {
    return this.repo.getTransactionEvaluations(transactionId, signal);
  }
}
