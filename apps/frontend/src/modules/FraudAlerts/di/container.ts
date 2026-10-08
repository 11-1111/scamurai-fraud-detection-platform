import type { InjectionKey } from "vue";
import type { FraudAlertsRepository } from "../application/ports/FraudAlertsRepository";
import { HttpFraudAlertsRepository } from "../infrastructure/repositories/HttpFraudAlertsRepository";
import { ListFraudAlerts } from "../application/use-cases/ListFraudAlerts";
import { GetFraudAlertDetails } from "../application/use-cases/GetFraudAlertDetails";
import { GetFraudAlertStats } from "../application/use-cases/GetFraudAlertStats";
import { AssignFraudAlert } from "../application/use-cases/AssignFraudAlert";
import { UpdateFraudAlertStatus } from "../application/use-cases/UpdateFraudAlertStatus";
import { ResolveFraudAlert } from "../application/use-cases/ResolveFraudAlert";
import { AddFraudAlertNote } from "../application/use-cases/AddFraudAlertNote";
import { GetLatestTransactionEvaluation } from "../application/use-cases/GetLatestTransactionEvaluation";
import { GetTransactionEvaluations } from "../application/use-cases/GetTransactionEvaluations";
import { GetFraudEvaluation } from "../application/use-cases/GetFraudEvaluation";

export const FRAUD_ALERTS_REPO: InjectionKey<FraudAlertsRepository> = Symbol("FRAUD_ALERTS_REPO");
export const LIST_FRAUD_ALERTS: InjectionKey<ListFraudAlerts> = Symbol("LIST_FRAUD_ALERTS");
export const GET_FRAUD_ALERT_DETAILS: InjectionKey<GetFraudAlertDetails> = Symbol(
  "GET_FRAUD_ALERT_DETAILS"
);
export const GET_FRAUD_ALERT_STATS: InjectionKey<GetFraudAlertStats> = Symbol(
  "GET_FRAUD_ALERT_STATS"
);
export const ASSIGN_FRAUD_ALERT: InjectionKey<AssignFraudAlert> = Symbol("ASSIGN_FRAUD_ALERT");
export const UPDATE_FRAUD_ALERT_STATUS: InjectionKey<UpdateFraudAlertStatus> = Symbol(
  "UPDATE_FRAUD_ALERT_STATUS"
);
export const RESOLVE_FRAUD_ALERT: InjectionKey<ResolveFraudAlert> = Symbol("RESOLVE_FRAUD_ALERT");
export const ADD_FRAUD_ALERT_NOTE: InjectionKey<AddFraudAlertNote> = Symbol("ADD_FRAUD_ALERT_NOTE");
export const GET_LATEST_TX_EVALUATION: InjectionKey<GetLatestTransactionEvaluation> = Symbol(
  "GET_LATEST_TX_EVALUATION"
);
export const GET_TX_EVALUATIONS: InjectionKey<GetTransactionEvaluations> = Symbol(
  "GET_TX_EVALUATIONS"
);
export const GET_FRAUD_EVALUATION: InjectionKey<GetFraudEvaluation> = Symbol(
  "GET_FRAUD_EVALUATION"
);

export function createFraudAlertsProviders() {
  const repo = new HttpFraudAlertsRepository();
  return [
    [FRAUD_ALERTS_REPO, repo],
    [LIST_FRAUD_ALERTS, new ListFraudAlerts(repo)],
    [GET_FRAUD_ALERT_DETAILS, new GetFraudAlertDetails(repo)],
    [GET_FRAUD_ALERT_STATS, new GetFraudAlertStats(repo)],
    [ASSIGN_FRAUD_ALERT, new AssignFraudAlert(repo)],
    [UPDATE_FRAUD_ALERT_STATUS, new UpdateFraudAlertStatus(repo)],
    [RESOLVE_FRAUD_ALERT, new ResolveFraudAlert(repo)],
    [ADD_FRAUD_ALERT_NOTE, new AddFraudAlertNote(repo)],
    [GET_LATEST_TX_EVALUATION, new GetLatestTransactionEvaluation(repo)],
    [GET_TX_EVALUATIONS, new GetTransactionEvaluations(repo)],
    [GET_FRAUD_EVALUATION, new GetFraudEvaluation(repo)],
  ] as const;
}
