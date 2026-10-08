import type { FraudAlertsRepository } from "../ports/FraudAlertsRepository";
import type { FraudEvaluation } from "../../domain/entities/FraudAlert";

export class GetFraudEvaluation {
  constructor(private readonly repo: FraudAlertsRepository) {}

  execute(evaluationId: string, signal?: AbortSignal): Promise<FraudEvaluation> {
    return this.repo.getEvaluation(evaluationId, signal);
  }
}
