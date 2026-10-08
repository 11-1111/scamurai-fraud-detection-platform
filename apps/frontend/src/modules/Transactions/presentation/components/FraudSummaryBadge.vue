<script setup lang="ts">
import { useRouter } from "vue-router";
import type { TransactionFraudSummary } from "../../domain/entities/Transaction";

const props = defineProps<{
  summary?: TransactionFraudSummary;
}>();

const router = useRouter();

function riskClass(level: string | null | undefined): string {
  switch ((level ?? "").toUpperCase()) {
    case "LOW":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "HIGH":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
    case "CRITICAL":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
}

function goToAlert() {
  if (!props.summary?.alertId) return;
  router.push({ name: "FraudAlertDetails", params: { id: props.summary.alertId } });
}
</script>

<template>
  <span v-if="!summary" class="text-xs text-slate-400" title="Fraud summary unavailable">—</span>
  <span
    v-else-if="!summary.isFlagged"
    class="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300"
  >
    Not flagged
  </span>
  <button
    v-else
    type="button"
    class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16659E]"
    :class="[
      riskClass(summary.riskLevel),
      summary.alertId ? 'cursor-pointer hover:opacity-90' : 'cursor-default',
    ]"
    :disabled="!summary.alertId"
    :aria-label="
      summary.alertId
        ? `Open fraud alert ${summary.alertId}, risk ${summary.riskLevel}, score ${summary.riskScore}`
        : `Flagged transaction, risk ${summary.riskLevel}, score ${summary.riskScore}`
    "
    @click.stop="goToAlert"
  >
    <span>{{ summary.riskLevel || "FLAGGED" }}</span>
    <span v-if="summary.riskScore != null" class="tabular-nums opacity-80">{{ summary.riskScore }}</span>
  </button>
</template>
