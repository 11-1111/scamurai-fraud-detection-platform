import type { Transaction, PageCorrelations, FraudProfile } from "../../domain/entities/Transaction";

export type TransactionListSource = "all" | "pending" | "incoming" | "card";

/** Transactions page tab — includes list sources plus Analytics view */
export type TransactionsPageTab = TransactionListSource | "analytics";

export interface TransactionFilters {
  merchantName?: string;
  customerEmail?: string;
  phoneNumber?: string;
  ipAddress?: string;
  confirmationCode?: string;
  orderTrackingId?: string;
  orderNumber?: string;
  bankAuthCode?: string;
  deviceFingerprint?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ListTransactionsParams {
  page: number;
  pageSize: number;
  source?: TransactionListSource;
  filters?: TransactionFilters;
}

export interface ListTransactionsResult {
  total: number;
  items: Transaction[];
  pageCorrelations: PageCorrelations;
  fraudProfile: FraudProfile | null;
}

export interface TransactionRepository {
  list(params: ListTransactionsParams): Promise<ListTransactionsResult>;
}
