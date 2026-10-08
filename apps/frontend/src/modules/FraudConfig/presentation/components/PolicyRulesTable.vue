<script setup lang="ts">
import { ref } from "vue";
import { ChevronRight } from "lucide-vue-next";
import type { PolicyRule } from "../../domain/entities/FraudConfig";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
} from "@/components/ui/table";

defineProps<{
  policies: PolicyRule[];
  isLoading?: boolean;
}>();

const expanded = ref<Record<string, boolean>>({});

const mainColumnCount = 10;

function toggleExpanded(code: string) {
  expanded.value[code] = !expanded.value[code];
}

function isExpanded(code: string): boolean {
  return Boolean(expanded.value[code]);
}

function decisionBadge(d: string): string {
  switch (d?.toUpperCase()) {
    case "ALLOW": return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    case "ALLOW_WITH_MONITORING": return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "MANUAL_REVIEW":
    case "REVIEW": return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
    case "BLOCK": return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    default: return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
}

function decisionLabel(d: string): string {
  return d?.toUpperCase() === "ALLOW_WITH_MONITORING" ? "ALLOW W/ MON." :
         d?.toUpperCase() === "MANUAL_REVIEW" ? "MANUAL REVIEW" :
         d?.toUpperCase() ?? "—";
}

function levelBadge(level: string): string {
  switch (level?.toUpperCase()) {
    case "LOW": return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    case "MEDIUM": return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "HIGH": return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
    case "CRITICAL": return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    default: return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
}

function enabledBadge(enabled: boolean): string {
  return enabled
    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
}

function dash(v: string | number | undefined | null): string {
  return v != null && v !== "" ? String(v) : "—";
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
    <Table class="w-full table-fixed text-sm">
      <TableHeader>
        <TableRow class="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <TableHead class="w-10 px-2 py-3" />
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap w-[7rem]">Policy Code</TableHead>
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 w-[12rem] whitespace-normal">Policy Name</TableHead>
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Condition Feature</TableHead>
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap w-[4.5rem]">Operator</TableHead>
          <TableHead class="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap w-[5rem]">Cond. Value</TableHead>
          <TableHead class="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap w-[4.5rem]">Min Score</TableHead>
          <TableHead class="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap w-[4.5rem]">Max Score</TableHead>
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap w-[5.5rem]">Risk Level</TableHead>
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap w-[6.5rem]">Decision</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        <template v-if="isLoading">
          <TableRow v-for="n in 5" :key="`skel-${n}`" class="border-b border-slate-100 dark:border-slate-800">
            <TableCell v-for="c in mainColumnCount" :key="c" class="px-4 py-3">
              <div class="h-4 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" :style="{ width: `${40 + (c * 11) % 45}%` }" />
            </TableCell>
          </TableRow>
        </template>

        <TableRow v-else-if="!policies.length">
          <TableCell :colspan="mainColumnCount">
            <TableEmpty>No policy rules found.</TableEmpty>
          </TableCell>
        </TableRow>

        <template v-else v-for="policy in policies" :key="policy.policyCode">
          <TableRow
            class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
          >
            <TableCell class="px-2 py-3 w-10 align-top">
              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                :aria-expanded="isExpanded(policy.policyCode)"
                :aria-label="isExpanded(policy.policyCode) ? 'Collapse details' : 'Expand details'"
                @click="toggleExpanded(policy.policyCode)"
              >
                <ChevronRight
                  class="h-4 w-4 text-slate-500 transition-transform duration-200"
                  :class="{ 'rotate-90': isExpanded(policy.policyCode) }"
                />
              </button>
            </TableCell>
            <TableCell class="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap align-top">
              {{ policy.policyCode }}
            </TableCell>
            <TableCell class="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 w-[12rem] max-w-[12rem] whitespace-normal break-words align-top">
              {{ policy.policyName }}
            </TableCell>
            <TableCell class="px-4 py-3 font-mono text-xs text-[#16659E] dark:text-[#16659E]/80 whitespace-normal break-words align-top">
              {{ policy.conditionFeature }}
            </TableCell>
            <TableCell class="px-2 py-3 whitespace-nowrap align-top">
              <span class="font-mono text-sm font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {{ policy.operator }}
              </span>
            </TableCell>
            <TableCell class="px-2 py-3 text-right font-mono text-sm tabular-nums font-semibold text-slate-700 dark:text-slate-300 align-top">
              {{ policy.conditionValue }}
            </TableCell>
            <TableCell class="px-2 py-3 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 align-top">
              {{ dash(policy.minScore) }}
            </TableCell>
            <TableCell class="px-2 py-3 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 align-top">
              {{ dash(policy.maxScore) }}
            </TableCell>
            <TableCell class="px-2 py-3 whitespace-nowrap align-top">
              <span
                v-if="policy.riskLevel"
                :class="['px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide', levelBadge(policy.riskLevel)]"
              >
                {{ policy.riskLevel }}
              </span>
              <span v-else class="text-slate-400 dark:text-slate-600">—</span>
            </TableCell>
            <TableCell class="px-2 py-3 whitespace-nowrap align-top">
              <span :class="['px-2 py-0.5 rounded text-[11px] font-bold uppercase', decisionBadge(policy.decision)]">
                {{ decisionLabel(policy.decision) }}
              </span>
            </TableCell>
          </TableRow>

          <TableRow
            v-if="isExpanded(policy.policyCode)"
            class="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40"
          >
            <TableCell :colspan="mainColumnCount" class="px-4 py-3">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-9">
                <div class="min-w-0">
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                    Action Label
                  </p>
                  <p class="text-sm text-slate-700 dark:text-slate-200 whitespace-normal break-words">
                    {{ policy.actionLabel || "—" }}
                  </p>
                </div>
                <div>
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                    Priority
                  </p>
                  <p class="text-sm font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                    {{ policy.priority }}
                  </p>
                </div>
                <div>
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                    Enabled
                  </p>
                  <span :class="['inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase', enabledBadge(policy.enabled)]">
                    {{ policy.enabled ? "Yes" : "No" }}
                  </span>
                </div>
              </div>
            </TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>
  </div>
</template>
