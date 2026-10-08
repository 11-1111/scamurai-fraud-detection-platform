<script setup lang="ts">
import type { FraudFeatureConfig } from "../../domain/entities/FraudConfig";
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
  features: FraudFeatureConfig[];
  isLoading?: boolean;
}>();

function formatWindow(seconds?: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
    <Table class="w-full min-w-max text-sm">
      <TableHeader>
        <TableRow class="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Feature</TableHead>
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Label</TableHead>
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Category</TableHead>
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Type</TableHead>
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Operators</TableHead>
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Unit</TableHead>
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Window</TableHead>
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Version</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty v-if="isLoading" :colspan="8">Loading features…</TableEmpty>
        <TableEmpty v-else-if="!features.length" :colspan="8">No features in catalog.</TableEmpty>
        <TableRow
          v-for="feature in features"
          v-else
          :key="feature.featureName"
          class="border-b border-slate-100 dark:border-slate-800"
        >
          <TableCell class="px-4 py-3 font-mono text-xs">{{ feature.featureName }}</TableCell>
          <TableCell class="px-4 py-3">{{ feature.label }}</TableCell>
          <TableCell class="px-4 py-3">{{ feature.category }}</TableCell>
          <TableCell class="px-4 py-3">{{ feature.dataType }}</TableCell>
          <TableCell class="px-4 py-3 text-xs">{{ feature.supportedOperators.join(", ") || "—" }}</TableCell>
          <TableCell class="px-4 py-3">{{ feature.unit || "—" }}</TableCell>
          <TableCell class="px-4 py-3">{{ formatWindow(feature.windowSeconds) }}</TableCell>
          <TableCell class="px-4 py-3">{{ feature.version || "—" }}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
