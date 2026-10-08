import type {
  CorrelatedIdentifier,
  FraudRelatedIdentifiers,
  PageCorrelations,
} from "../../domain/entities/Transaction";

export const CORRELATION_GROUP_KEYS = [
  "emails",
  "phones",
  "ips",
  "paymentAccounts",
  "fingerprints",
  "merchants",
  "confirmationCodes",
  "orderTrackingIds",
  "bankAuthCodes",
] as const;

export type CorrelationGroupKey = (typeof CORRELATION_GROUP_KEYS)[number];

export type CorrelationGroups = Pick<PageCorrelations, CorrelationGroupKey>;

const EMPTY_GROUPS: CorrelationGroups = {
  emails: [],
  phones: [],
  ips: [],
  paymentAccounts: [],
  fingerprints: [],
  merchants: [],
  confirmationCodes: [],
  orderTrackingIds: [],
  bankAuthCodes: [],
};

function mergeItems(
  primary: CorrelatedIdentifier[] = [],
  secondary: CorrelatedIdentifier[] = []
): CorrelatedIdentifier[] {
  const counts = new Map<string, number>();

  for (const item of [...primary, ...secondary]) {
    const value = String(item.value ?? "").trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + Number(item.count ?? 1));
  }

  return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
}

/** Merge page-scoped correlations with fraud profile relatedIdentifiers (all 9 groups). */
export function mergeCorrelationGroups(
  page?: Partial<CorrelationGroups> | null,
  related?: Partial<FraudRelatedIdentifiers> | null
): PageCorrelations {
  const merged = { scope: "CURRENT_PAGE" as const, ...EMPTY_GROUPS };

  for (const key of CORRELATION_GROUP_KEYS) {
    merged[key] = mergeItems(page?.[key], related?.[key]);
  }

  return merged;
}

export function hasAnyCorrelations(groups: Partial<CorrelationGroups> | null | undefined): boolean {
  if (!groups) return false;
  return CORRELATION_GROUP_KEYS.some((key) => (groups[key]?.length ?? 0) > 0);
}
