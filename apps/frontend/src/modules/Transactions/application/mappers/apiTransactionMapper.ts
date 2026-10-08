import type {
  ApiTransaction,
  ApiPageCorrelationsDTO,
  ApiFraudProfileDTO,
} from "../dto/ApiTransactionDTO";
import type {
  Transaction,
  TransactionStatusType,
  PageCorrelations,
  FraudProfile,
} from "../../domain/entities/Transaction";

// ─── Transaction mapper ───────────────────────────────────────────────────────

const toStatusType = (t: string | null | undefined): TransactionStatusType => {
  if (t === "danger" || t === "success" || t === "warning" || t === "info") return t;
  if (t === "failed") return "danger";
  return "info";
};

export function mapApiTransactionToDomain(api: ApiTransaction): Transaction {
  const amount = api.amount;
  const valueNum = amount?.value != null ? Number(amount.value) : 0;
  const fraud = api.fraudSummary;
  return {
    date: api.date ?? "",
    merchantName: api.merchant?.name ?? "",
    merchantEmail: api.merchant?.email ?? "",

    amountFull: amount?.full ?? "",
    currency: amount?.currency ?? "",
    amountValue: Number.isNaN(valueNum) ? 0 : valueNum,
    paymentMethod: amount?.paymentMethod ?? "",

    paymentAccount: api.paymentAccount ?? "",

    statusText: api.status?.text ?? "",
    statusType: toStatusType(api.status?.type),

    customerName: api.customer?.name ?? "",
    customerEmail: api.customer?.email ?? "",
    customerIp: api.customer?.ipAddress ?? "",

    confirmationCode: api.confirmationCode ?? "",
    merchantRef: api.merchantRef ?? "",
    viewUrl: api.viewUrl ?? "",
    orderTrackingId: api.orderTrackingId ?? undefined,
    orderNumber: api.merchantRef ?? undefined,
    phoneNumber: api.customer?.phone ?? undefined,
    bankAuthCode: api.bankAuthCode ?? undefined,
    deviceFingerprint: api.deviceFingerprint ?? undefined,
    fraudSummary: fraud
      ? {
          isFlagged: Boolean(fraud.isFlagged),
          alertId: fraud.alertId ?? null,
          evaluationId: fraud.evaluationId ?? null,
          riskScore: fraud.riskScore != null ? Number(fraud.riskScore) : null,
          riskLevel: fraud.riskLevel ?? null,
          decision: fraud.decision ?? null,
          severity: fraud.severity ?? null,
          evaluationStatus: fraud.evaluationStatus ?? null,
        }
      : undefined,
  };
}

// ─── Page correlations mapper ─────────────────────────────────────────────────

export function mapApiPageCorrelationsToDomain(
  input?: ApiPageCorrelationsDTO | null
): PageCorrelations {
  return {
    scope: "CURRENT_PAGE",
    emails: input?.emails ?? [],
    phones: input?.phones ?? [],
    ips: input?.ips ?? [],
    paymentAccounts: input?.paymentAccounts ?? [],
    fingerprints: input?.fingerprints ?? [],
    merchants: input?.merchants ?? [],
    confirmationCodes: input?.confirmationCodes ?? [],
    orderTrackingIds: input?.orderTrackingIds ?? [],
    bankAuthCodes: input?.bankAuthCodes ?? [],
  };
}

// ─── Fraud profile mapper ─────────────────────────────────────────────────────

export function mapApiFraudProfileToDomain(
  input?: ApiFraudProfileDTO | null
): FraudProfile | null {
  if (!input) return null;
  return {
    scope: input.scope ?? "GLOBAL",
    rootIdentifier: {
      type: input.rootIdentifier?.type ?? "",
      value: input.rootIdentifier?.value ?? "",
    },
    features: input.features ?? {},
    riskScore: Number(input.riskScore ?? 0),
    riskLevel: input.riskLevel ?? "LOW",
    defaultDecision: input.defaultDecision,
    decision: input.decision ?? input.defaultDecision ?? "ALLOW",
    displayColor: input.displayColor,
    policyActions: input.policyActions ?? [],
    relatedIdentifiers: {
      emails: input.relatedIdentifiers?.emails ?? [],
      phones: input.relatedIdentifiers?.phones ?? [],
      ips: input.relatedIdentifiers?.ips ?? [],
      paymentAccounts: input.relatedIdentifiers?.paymentAccounts ?? [],
      fingerprints: input.relatedIdentifiers?.fingerprints ?? [],
      merchants: input.relatedIdentifiers?.merchants ?? [],
      confirmationCodes: input.relatedIdentifiers?.confirmationCodes ?? [],
      orderTrackingIds: input.relatedIdentifiers?.orderTrackingIds ?? [],
      bankAuthCodes: input.relatedIdentifiers?.bankAuthCodes ?? [],
    },
    graph: {
      nodes: input.graph?.nodes ?? [],
      edges: input.graph?.edges ?? [],
    },
    triggeredRules: input.triggeredRules ?? [],
    reasons: input.reasons ?? [],
  };
}
