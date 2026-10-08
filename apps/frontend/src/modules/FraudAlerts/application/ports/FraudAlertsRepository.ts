import type {
  AddFraudAlertNoteInput,
  FraudAlertDetail,
  FraudAlertFilters,
  FraudAlertHistoryItem,
  FraudAlertListResponse,
  FraudAlertNote,
  FraudAlertStats,
  FraudEvaluation,
  UpdateFraudAlertInput,
} from "../../domain/entities/FraudAlert";

export interface FraudAlertsRepository {
  listAlerts(filters?: FraudAlertFilters, signal?: AbortSignal): Promise<FraudAlertListResponse>;
  getStats(signal?: AbortSignal): Promise<FraudAlertStats>;
  getAlert(alertId: string, signal?: AbortSignal): Promise<FraudAlertDetail>;
  getAlertHistory(alertId: string, signal?: AbortSignal): Promise<FraudAlertHistoryItem[]>;
  getAlertNotes(alertId: string, signal?: AbortSignal): Promise<FraudAlertNote[]>;
  addAlertNote(alertId: string, input: AddFraudAlertNoteInput): Promise<FraudAlertNote | unknown>;
  updateAlert(alertId: string, input: UpdateFraudAlertInput): Promise<unknown>;
  getLatestTransactionEvaluation(
    transactionId: string,
    signal?: AbortSignal
  ): Promise<FraudEvaluation | null>;
  getTransactionEvaluations(
    transactionId: string,
    signal?: AbortSignal
  ): Promise<FraudEvaluation[]>;
  getEvaluation(evaluationId: string, signal?: AbortSignal): Promise<FraudEvaluation>;
}
