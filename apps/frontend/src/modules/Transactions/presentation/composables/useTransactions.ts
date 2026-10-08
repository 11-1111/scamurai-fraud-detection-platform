import { computed, inject, onMounted, ref } from "vue";
import type { Transaction, PageCorrelations, FraudProfile } from "../../domain/entities/Transaction";
import type {
  TransactionFilters,
  TransactionListSource,
  TransactionsPageTab,
} from "../../application/ports/TransactionRepository";
import { mergeCorrelationGroups } from "../../application/mappers/correlationMapper";
import { LIST_TRANSACTIONS } from "../../di/container";

const emptyPageCorrelations: PageCorrelations = {
  scope: "CURRENT_PAGE",
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

export function useTransactions() {
  const listTransactions = inject(LIST_TRANSACTIONS);
  if (!listTransactions) throw new Error("ListTransactions not provided");

  const rows = ref<Transaction[]>([]);
  const total = ref(0);
  const pageCorrelations = ref<PageCorrelations>({ ...emptyPageCorrelations });
  const fraudProfile = ref<FraudProfile | null>(null);

  // Backward-compat alias so existing code using `correlations` still works
  const correlations = computed(() => pageCorrelations.value);

  const page = ref(1);
  const pageSize = ref(20);
  const isLoading = ref(false);
  const filters = ref<TransactionFilters>({});
  const source = ref<TransactionListSource>("all");
  const activeTab = ref<TransactionsPageTab>("all");
  const error = ref<Error | null>(null);

  function effectiveSource(): TransactionListSource {
    // Analytics uses search filters only — global fraud profile is not scoped to pending/incoming/card
    return activeTab.value === "analytics" ? "all" : source.value;
  }

  async function load() {
    if (!listTransactions) throw new Error("ListTransactions not provided");
    isLoading.value = true;
    error.value = null;
    try {
      const result = await listTransactions.execute({
        page: page.value,
        pageSize: pageSize.value,
        source: effectiveSource(),
        filters: Object.keys(filters.value).length > 0 ? filters.value : undefined,
      });
      rows.value = result.items;
      total.value = result.total;
      pageCorrelations.value = mergeCorrelationGroups(
        result.pageCorrelations,
        result.fraudProfile?.relatedIdentifiers
      );
      fraudProfile.value = result.fraudProfile ?? null;
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
      rows.value = [];
      total.value = 0;
      pageCorrelations.value = { ...emptyPageCorrelations };
      fraudProfile.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  function setSource(newSource: TransactionListSource) {
    source.value = newSource;
    activeTab.value = newSource;
    page.value = 1;
    load();
  }

  function setActiveTab(tab: TransactionsPageTab) {
    activeTab.value = tab;
    page.value = 1;
    if (tab !== "analytics") {
      source.value = tab;
    }
    load();
  }

  function applyFilters(newFilters: TransactionFilters) {
    filters.value = { ...newFilters };
    page.value = 1;
    load();
  }

  function clearFilters() {
    filters.value = {};
    page.value = 1;
    load();
  }

  function setPageSize(size: number) {
    pageSize.value = size;
    page.value = 1;
    load();
  }

  onMounted(load);

  const detailSheetOpen = ref(false);
  const selectedTransaction = ref<Transaction | null>(null);

  function openTransactionDetail(transaction: Transaction) {
    selectedTransaction.value = transaction;
    detailSheetOpen.value = true;
  }

  function closeTransactionDetail() {
    detailSheetOpen.value = false;
  }

  return {
    rows,
    total,
    page,
    pageSize,
    isLoading,
    error,
    pageCorrelations,
    fraudProfile,
    correlations,
    filters,
    source,
    activeTab,
    detailSheetOpen,
    selectedTransaction,
    load,
    setSource,
    setActiveTab,
    setPageSize,
    applyFilters,
    clearFilters,
    openTransactionDetail,
    closeTransactionDetail,
  };
}
