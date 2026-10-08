<script setup lang="ts">
import type { RiskLevel } from "../../domain/entities/FraudConfig";
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
  riskLevels: RiskLevel[];
  isLoading?: boolean;
}>();

function levelBadge(level: string): string {
  switch (level?.toUpperCase()) {
    case "LOW": return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    case "MEDIUM": return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "HIGH": return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
    case "CRITICAL": return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    default: return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
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

function enabledBadge(enabled: boolean): string {
  return enabled
    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
    <Table class="w-full min-w-max text-sm">
      <TableHeader>
        <TableRow class="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Level</TableHead>
          <TableHead class="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Min Score</TableHead>
          <TableHead class="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Max Score</TableHead>
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Default Decision</TableHead>
          <TableHead class="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Priority</TableHead>
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Enabled</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        <template v-if="isLoading">
          <TableRow v-for="n in 4" :key="`skel-${n}`" class="border-b border-slate-100 dark:border-slate-800">
            <TableCell v-for="c in 6" :key="c" class="px-4 py-3">
              <div class="h-4 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" :style="{ width: `${45 + (c * 17) % 40}%` }" />
            </TableCell>
          </TableRow>
        </template>

        <TableRow v-else-if="!riskLevels.length">
          <TableCell colspan="6">
            <TableEmpty>No risk levels found.</TableEmpty>
          </TableCell>
        </TableRow>

        <TableRow
          v-else
          v-for="rl in riskLevels"
          :key="rl.levelCode"
          class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
        >
          <TableCell class="px-4 py-3">
            <span :class="['px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wide', levelBadge(rl.levelCode)]">
              {{ rl.levelCode }}
            </span>
          </TableCell>
          <TableCell class="px-4 py-3 text-right font-mono text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">
            {{ rl.minScore }}
          </TableCell>
          <TableCell class="px-4 py-3 text-right font-mono text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">
            {{ rl.maxScore }}
          </TableCell>
          <TableCell class="px-4 py-3 whitespace-nowrap">
            <span :class="['px-2 py-0.5 rounded text-[11px] font-bold uppercase', decisionBadge(rl.defaultDecision)]">
              {{ decisionLabel(rl.defaultDecision) }}
            </span>
          </TableCell>
          <TableCell class="px-4 py-3 text-right font-mono text-sm tabular-nums text-slate-600 dark:text-slate-400">
            {{ rl.priority }}
          </TableCell>
          <TableCell class="px-4 py-3">
            <span :class="['px-2 py-0.5 rounded-full text-[11px] font-bold uppercase', enabledBadge(rl.enabled)]">
              {{ rl.enabled ? "Yes" : "No" }}
            </span>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
