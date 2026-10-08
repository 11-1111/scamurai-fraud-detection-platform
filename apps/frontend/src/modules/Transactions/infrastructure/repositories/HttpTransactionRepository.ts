import type {
  ListTransactionsParams,
  ListTransactionsResult,
  TransactionRepository,
} from "../../application/ports/TransactionRepository";
import type { ApiTransactionsResponse } from "../../application/dto/ApiTransactionDTO";
import {
  mapApiTransactionToDomain,
  mapApiPageCorrelationsToDomain,
  mapApiFraudProfileToDomain,
} from "../../application/mappers/apiTransactionMapper";
import { mergeCorrelationGroups } from "../../application/mappers/correlationMapper";
import { API_BASE_URL, BFF_TRANSACTIONS_PATH } from "../config/apiConfig";

/**
 * Maps application filter keys to API query parameter names (case-sensitive per PRD).
 */
function buildQueryParams(params: ListTransactionsParams): string {
  const { page, pageSize, filters } = params;
  const search = new URLSearchParams();

  search.set("page", String(page));
  search.set("pageSize", String(pageSize));

  if (filters) {
    const set = (apiKey: string, value: string | undefined) => {
      if (value != null && String(value).trim() !== "") {
        search.set(apiKey, String(value).trim());
      }
    };
    set("Merchant", filters.merchantName);
    set("CustomerEmail", filters.customerEmail);
    set("Phone", filters.phoneNumber);
    set("IpAddress", filters.ipAddress);
    set("DeviceFingerprint", filters.deviceFingerprint);
    set("ConfirmationCode", filters.confirmationCode);
    set("OrderTrackingId", filters.orderTrackingId);
    set("BankAuthCode", filters.bankAuthCode);
    set("DateFrom", filters.dateFrom);
    set("DateTo", filters.dateTo);
  }

  return search.toString();
}

export class HttpTransactionRepository implements TransactionRepository {
  constructor(private readonly baseUrl: string = API_BASE_URL) {}

  async list(params: ListTransactionsParams): Promise<ListTransactionsResult> {
    const query = buildQueryParams(params);
    const url = `${this.baseUrl}${BFF_TRANSACTIONS_PATH}${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Transactions API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ApiTransactionsResponse;

    const items = (data.transactions ?? []).map(mapApiTransactionToDomain);
    const total = data.total ?? 0;

    // Support pageCorrelations, legacy correlations, and fraudProfile.relatedIdentifiers
    const correlationsInput = data.pageCorrelations ?? data.correlations ?? null;
    const fraudProfile = mapApiFraudProfileToDomain(data.fraudProfile ?? null);
    const pageCorrelations = mergeCorrelationGroups(
      mapApiPageCorrelationsToDomain(correlationsInput),
      fraudProfile?.relatedIdentifiers ?? null
    );

    return {
      total,
      items,
      pageCorrelations,
      fraudProfile,
    };
  }
}
