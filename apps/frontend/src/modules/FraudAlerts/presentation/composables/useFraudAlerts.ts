import { ref, onMounted, onBeforeUnmount, inject, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type {
  FraudAlertFilters,
  FraudAlertStats,
  FraudAlertSummary,
} from "../../domain/entities/FraudAlert";
import { LIST_FRAUD_ALERTS, GET_FRAUD_ALERT_STATS } from "../../di/container";
import { ListFraudAlerts } from "../../application/use-cases/ListFraudAlerts";
import { GetFraudAlertStats } from "../../application/use-cases/GetFraudAlertStats";
import { HttpFraudAlertsRepository } from "../../infrastructure/repositories/HttpFraudAlertsRepository";

function fallbackList(): ListFraudAlerts {
  return new ListFraudAlerts(new HttpFraudAlertsRepository());
}
function fallbackStats(): GetFraudAlertStats {
  return new GetFraudAlertStats(new HttpFraudAlertsRepository());
}

const FILTER_KEYS: (keyof FraudAlertFilters)[] = [
  "status",
  "riskLevel",
  "decision",
  "severity",
  "assignedTo",
  "search",
  "rootIdentifierType",
  "rootIdentifierValue",
  "from",
  "to",
  "sortBy",
  "sortDir",
];

function filtersFromQuery(query: Record<string, unknown>): FraudAlertFilters {
  const out: FraudAlertFilters = {};
  for (const key of FILTER_KEYS) {
    const raw = query[key];
    if (typeof raw === "string" && raw.trim()) {
      if (key === "sortDir" && (raw === "asc" || raw === "desc")) {
        out.sortDir = raw;
      } else if (key !== "sortDir") {
        out[key] = raw as never;
      }
    }
  }
  return out;
}

function pageFromQuery(query: Record<string, unknown>, fallback: number): number {
  const raw = query.page;
  const n = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : fallback;
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

function pageSizeFromQuery(query: Record<string, unknown>, fallback: number): number {
  const raw = query.pageSize;
  const n = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : fallback;
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

export function useFraudAlerts() {
  const route = useRoute();
  const router = useRouter();
  const listAlerts = inject(LIST_FRAUD_ALERTS, null) ?? fallbackList();
  const getStats = inject(GET_FRAUD_ALERT_STATS, null) ?? fallbackStats();

  const alerts = ref<FraudAlertSummary[]>([]);
  const stats = ref<FraudAlertStats | null>(null);
  const page = ref(pageFromQuery(route.query as Record<string, unknown>, 1));
  const pageSize = ref(pageSizeFromQuery(route.query as Record<string, unknown>, 20));
  const total = ref(0);
  const filters = ref<FraudAlertFilters>(
    filtersFromQuery(route.query as Record<string, unknown>)
  );
  const loading = ref(false);
  const statsLoading = ref(false);
  const error = ref<Error | null>(null);

  let alertsAbort: AbortController | null = null;
  let statsAbort: AbortController | null = null;
  let requestSeq = 0;
  let syncingUrl = false;

  function syncUrl() {
    syncingUrl = true;
    const query: Record<string, string> = {};
    if (page.value > 1) query.page = String(page.value);
    if (pageSize.value !== 20) query.pageSize = String(pageSize.value);
    for (const key of FILTER_KEYS) {
      const value = filters.value[key];
      if (value != null && String(value).trim() !== "") {
        query[key] = String(value);
      }
    }
    void router.replace({ query }).finally(() => {
      syncingUrl = false;
    });
  }

  async function loadAlerts() {
    alertsAbort?.abort();
    alertsAbort = new AbortController();
    const seq = ++requestSeq;
    loading.value = true;
    error.value = null;
    try {
      const result = await listAlerts.execute(
        {
          ...filters.value,
          page: page.value,
          pageSize: pageSize.value,
        },
        alertsAbort.signal
      );
      if (seq !== requestSeq) return;
      alerts.value = result.alerts ?? [];
      total.value = result.total ?? 0;
      page.value = result.page ?? page.value;
      pageSize.value = result.pageSize ?? pageSize.value;
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      error.value = e instanceof Error ? e : new Error(String(e));
      alerts.value = [];
      total.value = 0;
    } finally {
      if (seq === requestSeq) loading.value = false;
    }
  }

  async function loadStats() {
    statsAbort?.abort();
    statsAbort = new AbortController();
    statsLoading.value = true;
    try {
      stats.value = await getStats.execute(statsAbort.signal);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      if (!error.value) {
        error.value = e instanceof Error ? e : new Error(String(e));
      }
      stats.value = null;
    } finally {
      statsLoading.value = false;
    }
  }

  function setFilter(key: keyof FraudAlertFilters, value: string | number | undefined) {
    filters.value = { ...filters.value, [key]: value };
  }

  function applyFilters(newFilters: FraudAlertFilters) {
    filters.value = { ...newFilters };
    page.value = 1;
    syncUrl();
    loadAlerts();
  }

  function clearFilters() {
    filters.value = {};
    page.value = 1;
    syncUrl();
    loadAlerts();
  }

  function goToPage(nextPage: number) {
    page.value = Math.max(1, nextPage);
    syncUrl();
    loadAlerts();
  }

  function setPageSize(size: number) {
    pageSize.value = size;
    page.value = 1;
    syncUrl();
    loadAlerts();
  }

  async function refresh() {
    await Promise.all([loadAlerts(), loadStats()]);
  }

  watch(
    () => route.query,
    (query) => {
      if (syncingUrl) return;
      filters.value = filtersFromQuery(query as Record<string, unknown>);
      page.value = pageFromQuery(query as Record<string, unknown>, 1);
      pageSize.value = pageSizeFromQuery(query as Record<string, unknown>, 20);
      loadAlerts();
    }
  );

  onMounted(refresh);
  onBeforeUnmount(() => {
    alertsAbort?.abort();
    statsAbort?.abort();
  });

  return {
    alerts,
    stats,
    page,
    pageSize,
    total,
    filters,
    loading,
    statsLoading,
    error,
    loadAlerts,
    loadStats,
    setFilter,
    applyFilters,
    clearFilters,
    goToPage,
    setPageSize,
    refresh,
  };
}
