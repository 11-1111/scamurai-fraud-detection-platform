import type {
  ApiFeatureSnapshotDTO,
  ApiFraudAlertDetailDTO,
  ApiFraudAlertHistoryDTO,
  ApiFraudAlertListDTO,
  ApiFraudAlertNoteDTO,
  ApiFraudAlertSummaryDTO,
  ApiFraudEvaluationDTO,
  ApiGraphDTO,
  ApiPolicyActionDTO,
  ApiTriggeredRuleDTO,
} from "../dto/ApiFraudAlertDTO";
import type {
  FeatureSnapshot,
  FraudAlertDetail,
  FraudAlertHistoryItem,
  FraudAlertListResponse,
  FraudAlertNote,
  FraudAlertSummary,
  FraudAlertTransactionInfo,
  FraudEvaluation,
  FraudGraph,
  PolicyAction,
  TriggeredRule,
} from "../../domain/entities/FraudAlert";

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

export function mapGraph(input?: ApiGraphDTO | null): FraudGraph {
  return {
    nodes: (input?.nodes ?? []).map((n, i) => ({
      id: str(n.id, `node-${i}`),
      label: str(n.label, str(n.id)),
      type: str(n.type, "Unknown"),
    })),
    edges: (input?.edges ?? []).map((e, i) => ({
      id: str(e.id, `edge-${i}`),
      source: str(e.source),
      target: str(e.target),
      label: str(e.label),
      count: e.count != null ? num(e.count) : undefined,
    })),
  };
}

export function mapTriggeredRule(r: ApiTriggeredRuleDTO): TriggeredRule {
  return {
    ruleId: r.ruleId ?? null,
    ruleCode: str(r.ruleCode),
    ruleName: str(r.ruleName, str(r.ruleCode)),
    featureName: r.featureName ?? null,
    operator: r.operator ?? null,
    thresholdValue: r.thresholdValue != null ? num(r.thresholdValue) : null,
    actualValue: r.actualValue ?? r.featureValue ?? null,
    scoreImpact: num(r.scoreImpact),
    severity: str(r.severity, "MEDIUM"),
    message: r.message ?? null,
  };
}

export function mapPolicyAction(p: ApiPolicyActionDTO): PolicyAction {
  return {
    policyCode: str(p.policyCode),
    policyName: str(p.policyName, str(p.policyCode)),
    decision: str(p.decision),
    actionLabel: str(p.actionLabel),
    priority: num(p.priority),
  };
}

function mapFeatureSnapshots(
  features?: ApiFeatureSnapshotDTO[] | Record<string, number | string | boolean | null>
): { snapshots: FeatureSnapshot[]; featureMap: Record<string, number | string | boolean | null> } {
  if (!features) return { snapshots: [], featureMap: {} };

  if (Array.isArray(features)) {
    const snapshots = features.map((f) => ({
      featureName: str(f.featureName),
      label: str(f.label, str(f.featureName)),
      description: str(f.description),
      category: str(f.category, "General"),
      value: f.value ?? null,
      valueType: str(f.valueType, typeof f.value),
      unit: f.unit ?? null,
      windowSeconds: f.windowSeconds != null ? num(f.windowSeconds) : null,
      calculatedAt: f.calculatedAt ?? null,
    }));
    const featureMap: Record<string, number | string | boolean | null> = {};
    for (const s of snapshots) featureMap[s.featureName] = s.value;
    return { snapshots, featureMap };
  }

  const featureMap = { ...features };
  const snapshots = Object.entries(features).map(([key, value]) => ({
    featureName: key,
    label: key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim(),
    description: "",
    category: "General",
    value,
    valueType: value == null ? "null" : typeof value,
    unit: null,
    windowSeconds: null,
    calculatedAt: null,
  }));
  return { snapshots, featureMap };
}

export function mapEvaluation(input?: ApiFraudEvaluationDTO | null): FraudEvaluation | null {
  if (!input) return null;
  const { snapshots, featureMap } = mapFeatureSnapshots(input.features);
  return {
    id: str(input.id),
    fraudTransactionId: input.fraudTransactionId ?? null,
    evaluationVersion: input.evaluationVersion ?? null,
    evaluationReason: input.evaluationReason ?? null,
    status: str(input.status, "UNKNOWN"),
    riskScore: num(input.riskScore),
    riskLevel: str(input.riskLevel, "LOW"),
    policyDecision: str(input.policyDecision ?? input.decision, "ALLOW"),
    featureEngineVersion: input.featureEngineVersion ?? null,
    rulesEngineVersion: input.rulesEngineVersion ?? null,
    startedAt: input.startedAt ?? null,
    completedAt: input.completedAt ?? null,
    createdAt: input.createdAt ?? null,
    features: snapshots,
    featureMap,
    triggeredRules: (input.triggeredRules ?? []).map(mapTriggeredRule),
    policyActions: (input.policyActions ?? []).map(mapPolicyAction),
    reasons: input.reasons ?? [],
    graph: mapGraph(input.graph),
  };
}

export function mapAlertSummary(item: ApiFraudAlertSummaryDTO): FraudAlertSummary {
  const type = str(
    item.rootIdentifierType ?? item.rootIdentifier?.type,
    ""
  );
  const value = str(
    item.rootIdentifierValue ?? item.rootIdentifier?.value,
    ""
  );
  const decision = str(item.decision ?? item.finalDecision, "ALLOW");
  const status = str(item.status ?? item.alertStatus, "OPEN");
  const severity = item.severity ?? item.highestSeverity ?? null;

  return {
    id: str(item.id),
    fraudTransactionId: item.fraudTransactionId ?? item.transactionId ?? null,
    transactionId: item.fraudTransactionId ?? item.transactionId ?? null,
    rootIdentifierType: type,
    rootIdentifierValue: value,
    rootIdentifier: { type, value },
    riskScore: num(item.riskScore),
    riskLevel: str(item.riskLevel, "LOW"),
    severity,
    highestSeverity: severity,
    decision,
    finalDecision: decision,
    defaultDecision: item.defaultDecision ?? null,
    status,
    alertStatus: status,
    merchantName: item.merchantName ?? null,
    customerName: item.customerName ?? null,
    customerEmail: item.customerEmail ?? null,
    paymentAccount: item.paymentAccount ?? null,
    createdAt: str(item.createdAt),
    updatedAt: item.updatedAt ?? null,
    assignedTo: item.assignedTo ?? null,
    resolution: item.resolution ?? null,
  };
}

function mapTransactionInfo(
  tx?: Record<string, unknown> | null
): FraudAlertTransactionInfo | null {
  if (!tx) return null;
  const merchant = (tx.merchant as Record<string, unknown> | undefined) ?? undefined;
  const customer = (tx.customer as Record<string, unknown> | undefined) ?? undefined;
  const amount = tx.amount as Record<string, unknown> | string | number | undefined;

  return {
    merchantName: str(tx.merchantName ?? merchant?.name, "") || null,
    merchantEmail: str(tx.merchantEmail ?? merchant?.email, "") || null,
    customerName: str(tx.customerName ?? customer?.name, "") || null,
    customerEmail: str(tx.customerEmail ?? customer?.email, "") || null,
    phone: str(tx.phone ?? tx.phoneNumber ?? customer?.phone, "") || null,
    ip: str(tx.ip ?? tx.customerIp ?? customer?.ipAddress, "") || null,
    paymentAccount: str(tx.paymentAccount, "") || null,
    deviceFingerprint: str(tx.deviceFingerprint, "") || null,
    merchantRef: str(tx.merchantRef, "") || null,
    orderTrackingId: str(tx.orderTrackingId, "") || null,
    amount:
      typeof amount === "object" && amount
        ? str(amount.full ?? amount.value, "") || null
        : amount ?? null,
    currency:
      typeof amount === "object" && amount ? str(amount.currency, "") || null : str(tx.currency, "") || null,
    transactionStatus: str(
      tx.transactionStatus ??
        (typeof tx.status === "object" && tx.status
          ? (tx.status as Record<string, unknown>).text
          : tx.status),
      ""
    ) || null,
  };
}

export function mapAlertNote(n: ApiFraudAlertNoteDTO): FraudAlertNote {
  return {
    id: num(n.id),
    note: str(n.note),
    createdBy: n.createdBy ?? null,
    createdAt: str(n.createdAt),
  };
}

export function mapAlertHistory(h: ApiFraudAlertHistoryDTO): FraudAlertHistoryItem {
  return {
    id: num(h.id),
    actionType: str(h.actionType),
    previousStatus: h.previousStatus ?? null,
    newStatus: h.newStatus ?? null,
    previousAssignee: h.previousAssignee ?? null,
    newAssignee: h.newAssignee ?? null,
    resolution: h.resolution ?? null,
    comment: h.comment ?? null,
    performedBy: h.performedBy ?? null,
    createdAt: str(h.createdAt),
  };
}

export function mapAlertDetail(raw: ApiFraudAlertDetailDTO): FraudAlertDetail {
  const summary = mapAlertSummary(raw);
  const latestEvaluation = mapEvaluation(raw.latestEvaluation);
  const { snapshots, featureMap } = mapFeatureSnapshots(raw.features);

  const features =
    snapshots.length > 0 ? snapshots : latestEvaluation?.features ?? [];
  const map =
    Object.keys(featureMap).length > 0
      ? featureMap
      : latestEvaluation?.featureMap ?? {};

  const graph =
    raw.graph && ((raw.graph.nodes?.length ?? 0) > 0 || (raw.graph.edges?.length ?? 0) > 0)
      ? mapGraph(raw.graph)
      : latestEvaluation?.graph ?? { nodes: [], edges: [] };

  return {
    ...summary,
    transaction: mapTransactionInfo(raw.transaction),
    triggeredRules:
      (raw.triggeredRules ?? []).map(mapTriggeredRule).length > 0
        ? (raw.triggeredRules ?? []).map(mapTriggeredRule)
        : latestEvaluation?.triggeredRules ?? [],
    policyActions:
      (raw.policyActions ?? []).map(mapPolicyAction).length > 0
        ? (raw.policyActions ?? []).map(mapPolicyAction)
        : latestEvaluation?.policyActions ?? [],
    notes: (raw.notes ?? []).map(mapAlertNote),
    history: (raw.history ?? []).map(mapAlertHistory),
    latestEvaluation,
    features,
    featureMap: map,
    relatedIdentifiers: Object.fromEntries(
      Object.entries(raw.relatedIdentifiers ?? {}).map(([k, arr]) => [
        k,
        (arr ?? []).map((e) => ({ value: str(e.value), count: num(e.count) })),
      ])
    ),
    graph,
    reasons: raw.reasons ?? latestEvaluation?.reasons ?? [],
  };
}

export function mapAlertList(raw: ApiFraudAlertListDTO | ApiFraudAlertSummaryDTO[]): FraudAlertListResponse {
  if (Array.isArray(raw)) {
    return {
      page: 1,
      pageSize: raw.length,
      total: raw.length,
      alerts: raw.map(mapAlertSummary),
    };
  }
  const alerts = raw.alerts ?? raw.data ?? raw.items ?? [];
  return {
    page: num(raw.page, 1),
    pageSize: num(raw.pageSize, alerts.length || 20),
    total: num(raw.total, alerts.length),
    alerts: alerts.map(mapAlertSummary),
  };
}

export function buildAlertQuery(filters: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && String(value).trim() !== "") {
      params.set(key, String(value).trim());
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
