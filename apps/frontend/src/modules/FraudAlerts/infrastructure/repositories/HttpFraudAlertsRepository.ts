import type { FraudAlertsRepository } from "../../application/ports/FraudAlertsRepository";
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
import type {
  ApiFraudAlertDetailDTO,
  ApiFraudAlertHistoryDTO,
  ApiFraudAlertListDTO,
  ApiFraudAlertNoteDTO,
  ApiFraudEvaluationDTO,
} from "../../application/dto/ApiFraudAlertDTO";
import {
  buildAlertQuery,
  mapAlertDetail,
  mapAlertHistory,
  mapAlertList,
  mapAlertNote,
  mapEvaluation,
} from "../../application/mappers/fraudAlertMapper";
import {
  API_BASE_URL,
  BFF_FRAUD_ALERTS_PATH,
  BFF_FRAUD_EVALUATIONS_PATH,
  BFF_FRAUD_TRANSACTIONS_PATH,
} from "../config/apiConfig";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { message?: string; error?: string };
      detail = body.message ?? body.error ?? "";
    } catch {
      // ignore
    }
    throw new Error(
      detail
        ? `Fraud Alerts API error: ${res.status} ${res.statusText} — ${detail}`
        : `Fraud Alerts API error: ${res.status} ${res.statusText} (${path})`
    );
  }

  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

function toArray<T>(raw: unknown, keys: string[]): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const k of keys) {
      if (Array.isArray(obj[k])) return obj[k] as T[];
    }
  }
  return [];
}

export class HttpFraudAlertsRepository implements FraudAlertsRepository {
  listAlerts(filters: FraudAlertFilters = {}, signal?: AbortSignal): Promise<FraudAlertListResponse> {
    const qs = buildAlertQuery({
      page: filters.page,
      pageSize: filters.pageSize,
      status: filters.status,
      riskLevel: filters.riskLevel,
      decision: filters.decision,
      severity: filters.severity,
      assignedTo: filters.assignedTo,
      search: filters.search,
      rootIdentifierType: filters.rootIdentifierType,
      rootIdentifierValue: filters.rootIdentifierValue,
      from: filters.from,
      to: filters.to,
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
    });
    return requestJson<ApiFraudAlertListDTO>(`${BFF_FRAUD_ALERTS_PATH}${qs}`, { signal }).then(
      mapAlertList
    );
  }

  async getStats(signal?: AbortSignal): Promise<FraudAlertStats> {
    try {
      const raw = await requestJson<Partial<FraudAlertStats> & Record<string, unknown>>(
        `${BFF_FRAUD_ALERTS_PATH}/stats`,
        { signal }
      );
      return {
        totalOpen: Number(raw.totalOpen ?? 0),
        totalAssigned: Number(raw.totalAssigned ?? 0),
        totalUnderReview: Number(raw.totalUnderReview ?? 0),
        totalResolved: Number(raw.totalResolved ?? 0),
        totalCritical: Number(raw.totalCritical ?? 0),
        totalHigh: Number(raw.totalHigh ?? 0),
        byDecision: Array.isArray(raw.byDecision) ? raw.byDecision : [],
        byRiskLevel: Array.isArray(raw.byRiskLevel) ? raw.byRiskLevel : [],
      };
    } catch {
      return {
        totalOpen: 0,
        totalAssigned: 0,
        totalUnderReview: 0,
        totalResolved: 0,
        totalCritical: 0,
        totalHigh: 0,
        byDecision: [],
        byRiskLevel: [],
      };
    }
  }

  async getAlert(alertId: string, signal?: AbortSignal): Promise<FraudAlertDetail> {
    const raw = await requestJson<ApiFraudAlertDetailDTO | { alert?: ApiFraudAlertDetailDTO }>(
      `${BFF_FRAUD_ALERTS_PATH}/${encodeURIComponent(alertId)}`,
      { signal }
    );
    const dto =
      raw && typeof raw === "object" && "alert" in raw && raw.alert
        ? raw.alert
        : (raw as ApiFraudAlertDetailDTO);
    return mapAlertDetail(dto);
  }

  async getAlertHistory(alertId: string, signal?: AbortSignal): Promise<FraudAlertHistoryItem[]> {
    const raw = await requestJson<unknown>(
      `${BFF_FRAUD_ALERTS_PATH}/${encodeURIComponent(alertId)}/history`,
      { signal }
    );
    return toArray<ApiFraudAlertHistoryDTO>(raw, ["history", "data", "items"]).map(mapAlertHistory);
  }

  async getAlertNotes(alertId: string, signal?: AbortSignal): Promise<FraudAlertNote[]> {
    const raw = await requestJson<unknown>(
      `${BFF_FRAUD_ALERTS_PATH}/${encodeURIComponent(alertId)}/notes`,
      { signal }
    );
    return toArray<ApiFraudAlertNoteDTO>(raw, ["notes", "data", "items"]).map(mapAlertNote);
  }

  addAlertNote(alertId: string, input: AddFraudAlertNoteInput): Promise<FraudAlertNote | unknown> {
    return requestJson(`${BFF_FRAUD_ALERTS_PATH}/${encodeURIComponent(alertId)}/notes`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateAlert(alertId: string, input: UpdateFraudAlertInput): Promise<unknown> {
    return requestJson(`${BFF_FRAUD_ALERTS_PATH}/${encodeURIComponent(alertId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  /** Convenience wrappers for older action endpoints still used by UI */
  assign(id: string, assignedTo: string, extras?: UpdateFraudAlertInput): Promise<unknown> {
    return this.updateAlert(id, { assignedTo, ...extras });
  }

  updateStatus(id: string, status: string, extras?: UpdateFraudAlertInput): Promise<unknown> {
    return this.updateAlert(id, { status, ...extras });
  }

  resolve(id: string, payload: UpdateFraudAlertInput): Promise<unknown> {
    return this.updateAlert(id, {
      status: payload.status ?? "RESOLVED",
      resolution: payload.resolution,
      note: payload.note,
      comment: payload.comment,
      resolvedBy: payload.resolvedBy,
      performedBy: payload.performedBy,
    });
  }

  async getLatestTransactionEvaluation(
    transactionId: string,
    signal?: AbortSignal
  ): Promise<FraudEvaluation | null> {
    try {
      const raw = await requestJson<ApiFraudEvaluationDTO | { evaluation?: ApiFraudEvaluationDTO }>(
        `${BFF_FRAUD_TRANSACTIONS_PATH}/${encodeURIComponent(transactionId)}/evaluations/latest`,
        { signal }
      );
      const dto =
        raw && typeof raw === "object" && "evaluation" in raw && raw.evaluation
          ? raw.evaluation
          : (raw as ApiFraudEvaluationDTO);
      return mapEvaluation(dto);
    } catch {
      return null;
    }
  }

  async getTransactionEvaluations(
    transactionId: string,
    signal?: AbortSignal
  ): Promise<FraudEvaluation[]> {
    const raw = await requestJson<unknown>(
      `${BFF_FRAUD_TRANSACTIONS_PATH}/${encodeURIComponent(transactionId)}/evaluations`,
      { signal }
    );
    return toArray<ApiFraudEvaluationDTO>(raw, ["evaluations", "data", "items"])
      .map(mapEvaluation)
      .filter((e): e is FraudEvaluation => e != null);
  }

  async getEvaluation(evaluationId: string, signal?: AbortSignal): Promise<FraudEvaluation> {
    const raw = await requestJson<ApiFraudEvaluationDTO | { evaluation?: ApiFraudEvaluationDTO }>(
      `${BFF_FRAUD_EVALUATIONS_PATH}/${encodeURIComponent(evaluationId)}`,
      { signal }
    );
    const dto =
      raw && typeof raw === "object" && "evaluation" in raw && raw.evaluation
        ? raw.evaluation
        : (raw as ApiFraudEvaluationDTO);
    const mapped = mapEvaluation(dto);
    if (!mapped) throw new Error("Evaluation not found");
    return mapped;
  }
}
