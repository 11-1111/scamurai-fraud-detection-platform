<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import TransactionsTable from "../components/TransactionsTable.vue";
import TransactionFilters from "../components/TransactionFilters.vue";
import TransactionTabs from "../components/TransactionTabs.vue";
import RelatedDataSheet from "../components/RelatedDataSheet.vue";
import TransactionDetailSheet from "../components/TransactionDetailSheet.vue";
import FraudProfilePanel from "../components/fraud/FraudProfilePanel.vue";
import { useTransactions } from "../composables/useTransactions";
import type {
  TransactionFilters as TransactionFiltersType,
} from "../../application/ports/TransactionRepository";
import { Button } from "@/components/ui/button";

const {
  rows,
  total,
  page,
  pageSize,
  isLoading,
  error,
  pageCorrelations,
  fraudProfile,
  filters,
  activeTab,
  setActiveTab,
  setPageSize,
  load,
  applyFilters,
  clearFilters,
  detailSheetOpen,
  selectedTransaction,
  openTransactionDetail,
} = useTransactions();

const sheetOpen = ref(false);
const isFilters = ref(false);

function openRelatedData() {
  sheetOpen.value = true;
}

function next() {
  page.value += 1;
  load();
}
function prev() {
  page.value = Math.max(1, page.value - 1);
  load();
}

function handleApplyFilters(newFilters: TransactionFiltersType) {
  applyFilters(newFilters);
}

function handleClearFilters() {
  clearFilters();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "r" || e.key === "R") {
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      (target as HTMLElement).isContentEditable
    )
      return;
    e.preventDefault();
    openRelatedData();
  }
}

onMounted(() => {
  isFilters.value = true;
  window.addEventListener("keydown", onKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div class="min-h-screen w-full min-w-0 flex-1">
    <div class="mx-auto w-full max-w-full px-4 sm:px-6 lg:px-8">
      <div class="space-y-6 min-w-0">

        <!-- Tabs + Related Data button row -->
        <div class="flex flex-wrap justify-between items-center gap-4">
          <TransactionTabs :model-value="activeTab" @update:model-value="setActiveTab" />
          <div v-if="activeTab !== 'analytics'" class="flex justify-end">
            <RelatedDataSheet
              v-model:open="sheetOpen"
              :page-correlations="pageCorrelations"
              :related-identifiers="fraudProfile?.relatedIdentifiers"
              :current-page="page"
              :page-results-count="rows.length"
            >
              <template #trigger>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="gap-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Global Correlations
                  <kbd
                    class="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-600 dark:text-slate-400"
                  >R</kbd>
                </Button>
              </template>
            </RelatedDataSheet>
          </div>
        </div>

        <!-- Filters teleport target (always visible — shared across tabs including Analytics) -->
        <Teleport v-if="isFilters" to="#table-filters">
          <TransactionFilters
            :filters="filters"
            @apply="handleApplyFilters"
            @clear="handleClearFilters"
          />
        </Teleport>

        <!-- Generic error state -->
        <div
          v-if="error"
          class="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 px-4 py-3 text-sm text-red-800 dark:text-red-200"
        >
          <p class="font-medium">Unable to load transactions</p>
          <p class="mt-1 text-red-600 dark:text-red-300">{{ error.message }}</p>
          <button
            type="button"
            class="mt-3 rounded-md bg-red-100 dark:bg-red-900/50 px-3 py-1.5 text-sm font-medium text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900"
            @click="load"
          >
            Retry
          </button>
        </div>

        <div v-else class="min-w-0 space-y-6">

          <!-- Analytics: Global Fraud Profile (driven by current search filters) -->
          <div v-if="activeTab === 'analytics'">
            <FraudProfilePanel :fraud-profile="fraudProfile" />
          </div>

          <!-- Transaction list tabs -->
          <template v-else>
            <div class="min-w-0 overflow-x-auto">
              <TransactionsTable
                :data="rows"
                :total="total"
                :current-page="page"
                :page-size="pageSize"
                :is-loading="isLoading"
                @prev-page="prev"
                @next-page="next"
                @update:page-size="setPageSize"
                @view="openTransactionDetail"
              />
            </div>
          </template>

        </div>
      </div>
    </div>

    <TransactionDetailSheet
      v-model:open="detailSheetOpen"
      :transaction="selectedTransaction"
    />
  </div>
</template>
