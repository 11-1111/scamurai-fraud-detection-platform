<script setup lang="ts">
import { computed } from "vue";
import { useFraudAlerts } from "../composables/useFraudAlerts";
import FraudAlertStatsCards from "../components/FraudAlertStatsCards.vue";
import FraudAlertFilters from "../components/FraudAlertFilters.vue";
import FraudAlertsTable from "../components/FraudAlertsTable.vue";
import { Button } from "@/components/ui/button";

const {
  alerts,
  stats,
  page,
  pageSize,
  total,
  filters,
  loading,
  statsLoading,
  error,
  applyFilters,
  clearFilters,
  goToPage,
  setPageSize,
  refresh,
} = useFraudAlerts();

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const showingFrom = computed(() => (total.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1));
const showingTo = computed(() => Math.min(page.value * pageSize.value, total.value));

const pageSizeOptions = [10, 20, 50, 100];
</script>

<template>
  <div class="min-h-screen w-full flex-1 min-w-0">
    <div class="w-full px-4 sm:px-6 lg:px-8">
      <div class="space-y-6 min-w-0 py-2">
        <div
          v-if="error"
          class="mx-2 sm:mx-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 px-4 py-3 text-sm text-red-800 dark:text-red-200"
          role="alert"
        >
          <p class="font-medium">Failed to load fraud alerts</p>
          <p class="mt-1 text-red-600 dark:text-red-300">{{ error.message }}</p>
          <Button type="button" size="sm" variant="outline" class="mt-3" @click="refresh">
            Retry
          </Button>
        </div>

        <div class="px-2 sm:px-4">
          <FraudAlertStatsCards
            :stats="stats"
            :loading="statsLoading"
            :filters="filters"
            @filter="applyFilters"
          />
        </div>

        <div class="px-2 sm:px-4">
          <FraudAlertFilters
            :filters="filters"
            @apply="applyFilters"
            @clear="clearFilters"
            @refresh="refresh"
          />
        </div>

        <div class="px-2 sm:px-4">
          <FraudAlertsTable :alerts="alerts" :loading="loading" />
        </div>

        <div
          v-if="total > 0 || !loading"
          class="px-2 sm:px-4 flex flex-wrap items-center justify-between gap-3 pb-6"
        >
          <div class="flex flex-wrap items-center gap-3">
            <p class="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Showing {{ showingFrom }}–{{ showingTo }} of {{ total }}
            </p>
            <label class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Page size</span>
              <select
                class="h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-2 text-xs dark:bg-slate-950"
                :value="pageSize"
                aria-label="Page size"
                @change="setPageSize(Number(($event.target as HTMLSelectElement).value))"
              >
                <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
              </select>
            </label>
          </div>
          <div class="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              :disabled="page <= 1 || loading"
              aria-label="Previous page"
              @click="goToPage(page - 1)"
            >
              Previous
            </Button>
            <span class="text-xs tabular-nums text-slate-600 dark:text-slate-300">
              Page {{ page }} of {{ totalPages }}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              :disabled="page >= totalPages || loading"
              aria-label="Next page"
              @click="goToPage(page + 1)"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
