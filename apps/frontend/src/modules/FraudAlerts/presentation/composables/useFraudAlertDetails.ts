import { ref, inject } from "vue";
import type {
  FraudAlertDetail,
  FraudEvaluation,
  UpdateFraudAlertInput,
} from "../../domain/entities/FraudAlert";
import {
  GET_FRAUD_ALERT_DETAILS,
  ASSIGN_FRAUD_ALERT,
  UPDATE_FRAUD_ALERT_STATUS,
  RESOLVE_FRAUD_ALERT,
  ADD_FRAUD_ALERT_NOTE,
  GET_TX_EVALUATIONS,
  GET_FRAUD_EVALUATION,
} from "../../di/container";
import { GetFraudAlertDetails } from "../../application/use-cases/GetFraudAlertDetails";
import { AssignFraudAlert } from "../../application/use-cases/AssignFraudAlert";
import { UpdateFraudAlertStatus } from "../../application/use-cases/UpdateFraudAlertStatus";
import { ResolveFraudAlert } from "../../application/use-cases/ResolveFraudAlert";
import { AddFraudAlertNote } from "../../application/use-cases/AddFraudAlertNote";
import { GetTransactionEvaluations } from "../../application/use-cases/GetTransactionEvaluations";
import { GetFraudEvaluation } from "../../application/use-cases/GetFraudEvaluation";
import { HttpFraudAlertsRepository } from "../../infrastructure/repositories/HttpFraudAlertsRepository";

function repo() {
  return new HttpFraudAlertsRepository();
}

export function useFraudAlertDetails() {
  const getDetails = inject(GET_FRAUD_ALERT_DETAILS, null) ?? new GetFraudAlertDetails(repo());
  const assignUc = inject(ASSIGN_FRAUD_ALERT, null) ?? new AssignFraudAlert(repo());
  const statusUc = inject(UPDATE_FRAUD_ALERT_STATUS, null) ?? new UpdateFraudAlertStatus(repo());
  const resolveUc = inject(RESOLVE_FRAUD_ALERT, null) ?? new ResolveFraudAlert(repo());
  const noteUc = inject(ADD_FRAUD_ALERT_NOTE, null) ?? new AddFraudAlertNote(repo());
  const listEvals = inject(GET_TX_EVALUATIONS, null) ?? new GetTransactionEvaluations(repo());
  const getEval = inject(GET_FRAUD_EVALUATION, null) ?? new GetFraudEvaluation(repo());

  const alert = ref<FraudAlertDetail | null>(null);
  const evaluations = ref<FraudEvaluation[]>([]);
  const selectedEvaluation = ref<FraudEvaluation | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const actionLoading = ref(false);

  let loadAbort: AbortController | null = null;
  let loadSeq = 0;

  async function loadAlert(id: string) {
    loadAbort?.abort();
    loadAbort = new AbortController();
    const seq = ++loadSeq;
    loading.value = true;
    error.value = null;
    try {
      const detail = await getDetails.execute(id, loadAbort.signal);
      if (seq !== loadSeq) return;
      alert.value = detail;
      selectedEvaluation.value = detail.latestEvaluation;

      const txId = detail.fraudTransactionId ?? detail.transactionId;
      if (txId) {
        try {
          evaluations.value = await listEvals.execute(txId, loadAbort.signal);
        } catch {
          evaluations.value = detail.latestEvaluation ? [detail.latestEvaluation] : [];
        }
      } else {
        evaluations.value = detail.latestEvaluation ? [detail.latestEvaluation] : [];
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      error.value = e instanceof Error ? e : new Error(String(e));
      alert.value = null;
    } finally {
      if (seq === loadSeq) loading.value = false;
    }
  }

  async function selectEvaluation(evaluationId: string) {
    actionLoading.value = true;
    error.value = null;
    try {
      selectedEvaluation.value = await getEval.execute(evaluationId);
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
      throw e;
    } finally {
      actionLoading.value = false;
    }
  }

  async function runAction(fn: () => Promise<unknown>, id: string) {
    actionLoading.value = true;
    error.value = null;
    try {
      await fn();
      await loadAlert(id);
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
      throw e;
    } finally {
      actionLoading.value = false;
    }
  }

  function assignAlert(id: string, payload: UpdateFraudAlertInput | string) {
    return runAction(() => assignUc.execute(id, payload), id);
  }

  function updateStatus(id: string, payload: UpdateFraudAlertInput | string) {
    return runAction(() => statusUc.execute(id, payload), id);
  }

  function resolveAlert(
    id: string,
    resolution: string,
    note?: string,
    resolvedBy?: string
  ) {
    return runAction(
      () =>
        resolveUc.execute(id, {
          resolution,
          note,
          resolvedBy,
          status: "RESOLVED",
        }),
      id
    );
  }

  function addNote(id: string, note: string, createdBy?: string) {
    return runAction(() => noteUc.execute(id, { note, createdBy }), id);
  }

  function refresh() {
    if (alert.value?.id) return loadAlert(alert.value.id);
    return Promise.resolve();
  }

  return {
    alert,
    evaluations,
    selectedEvaluation,
    loading,
    error,
    actionLoading,
    loadAlert,
    selectEvaluation,
    assignAlert,
    updateStatus,
    resolveAlert,
    addNote,
    refresh,
  };
}

/** Alias matching the POC naming */
export const useFraudAlertDetail = useFraudAlertDetails;
