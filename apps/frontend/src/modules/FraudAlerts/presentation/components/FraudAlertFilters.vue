<script setup lang="ts">
import { ref, watch } from "vue";
import type { FraudAlertFilters } from "../../domain/entities/FraudAlert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-vue-next";

const props = defineProps<{ filters: FraudAlertFilters }>();

const emit = defineEmits<{
  apply: [filters: FraudAlertFilters];
  clear: [];
  refresh: [];
}>();

const local = ref<FraudAlertFilters>({ ...props.filters });

watch(
  () => props.filters,
  (v) => {
    local.value = { ...v };
  },
  { deep: true }
);

const riskOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const severityOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const decisionOptions = ["ALLOW", "REVIEW", "BLOCK", "MANUAL_REVIEW", "ALLOW_WITH_MONITORING", "HOLD", "ESCALATE"];
const sortByOptions = [
  { value: "createdAt", label: "Created" },
  { value: "riskScore", label: "Risk score" },
  { value: "severity", label: "Severity" },
  { value: "status", label: "Status" },
];

function cleanFilters(): FraudAlertFilters {
  const out: FraudAlertFilters = {};
  (Object.entries(local.value) as [keyof FraudAlertFilters, string | number | undefined][]).forEach(
    ([key, value]) => {
      if (value != null && String(value).trim() !== "") {
        out[key] = value as never;
      }
    }
  );
  return out;
}

function apply() {
  emit("apply", cleanFilters());
}

function clear() {
  local.value = {};
  emit("clear");
}
</script>

<template>
  <div
    class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4"
  >
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <label class="space-y-1.5 block md:col-span-2">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Search</span>
        <Input v-model="local.search" placeholder="Alert ID, merchant, customer, email…" @keydown.enter="apply" />
      </label>

      <label class="space-y-1.5 block">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</span>
        <Input v-model="local.status" placeholder="e.g. OPEN, ASSIGNED…" />
      </label>

      <label class="space-y-1.5 block">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Severity</span>
        <select
          v-model="local.severity"
          class="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm dark:bg-slate-950"
        >
          <option value="">All severities</option>
          <option v-for="opt in severityOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </label>

      <label class="space-y-1.5 block">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Risk Level</span>
        <select
          v-model="local.riskLevel"
          class="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm dark:bg-slate-950"
        >
          <option value="">All levels</option>
          <option v-for="opt in riskOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </label>

      <label class="space-y-1.5 block">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Decision</span>
        <select
          v-model="local.decision"
          class="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm dark:bg-slate-950"
        >
          <option value="">All decisions</option>
          <option v-for="opt in decisionOptions" :key="opt" :value="opt">{{ opt.replace(/_/g, " ") }}</option>
        </select>
      </label>

      <label class="space-y-1.5 block">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">From</span>
        <Input v-model="local.from" type="date" />
      </label>

      <label class="space-y-1.5 block">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">To</span>
        <Input v-model="local.to" type="date" />
      </label>

      <label class="space-y-1.5 block">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Sort by</span>
        <select
          v-model="local.sortBy"
          class="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm dark:bg-slate-950"
        >
          <option value="">Default</option>
          <option v-for="opt in sortByOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>

      <label class="space-y-1.5 block">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Sort direction</span>
        <select
          v-model="local.sortDir"
          class="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm dark:bg-slate-950"
        >
          <option value="">Default</option>
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>

      <label class="space-y-1.5 block">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Assigned To</span>
        <Input v-model="local.assignedTo" placeholder="Analyst…" />
      </label>
    </div>

    <div class="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        class="bg-[#16659e] text-white hover:bg-[#125580] focus-visible:ring-[#16659e]"
        @click="apply"
      >
        Apply Filters
      </Button>
      <Button type="button" size="sm" variant="outline" @click="clear">Clear</Button>
      <Button type="button" size="sm" variant="outline" class="gap-1.5" aria-label="Refresh alerts" @click="emit('refresh')">
        <RefreshCw class="h-3.5 w-3.5" />
        Refresh
      </Button>
    </div>
  </div>
</template>
