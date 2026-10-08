<script setup lang="ts">
import type { FraudRule } from "../../domain/entities/FraudConfig";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Power, PowerOff } from "lucide-vue-next";

defineProps<{
  rules: FraudRule[];
  isLoading?: boolean;
  actionLoading?: boolean;
}>();

const emit = defineEmits<{
  edit: [rule: FraudRule];
  enable: [rule: FraudRule];
  disable: [rule: FraudRule];
}>();

const columnCount = 9;

function severityBadge(s: string): string {
  switch (s?.toUpperCase()) {
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
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
    <Table class="w-full table-fixed text-sm">
      <TableHeader>
        <TableRow class="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap w-[7rem]">Rule Code</TableHead>
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 w-[14rem] whitespace-normal">Rule Name</TableHead>
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Feature</TableHead>
          <TableHead class="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap w-[4.5rem]">Operator</TableHead>
          <TableHead class="px-2 py-3 text-right font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap w-[4rem]">Threshold</TableHead>
          <TableHead class="px-2 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap w-[5.5rem]">Severity</TableHead>
          <TableHead class="px-2 py-3 text-right font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap w-[4.5rem]" title="Score Impact">Impact</TableHead>
          <TableHead class="px-2 py-3 text-center font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap w-[4rem]" title="Enabled">On</TableHead>
          <TableHead class="px-2 py-3 text-right font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap w-[7.5rem]">Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        <template v-if="isLoading">
          <TableRow v-for="n in 5" :key="`skel-${n}`" class="border-b border-slate-100 dark:border-slate-800">
            <TableCell v-for="c in columnCount" :key="c" class="px-4 py-3">
              <div class="h-4 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" :style="{ width: `${50 + (c * 13) % 40}%` }" />
            </TableCell>
          </TableRow>
        </template>

        <TableRow v-else-if="!rules.length">
          <TableCell :colspan="columnCount">
            <TableEmpty>No fraud rules found.</TableEmpty>
          </TableCell>
        </TableRow>

        <TableRow
          v-else
          v-for="rule in rules"
          :key="rule.id || rule.ruleCode"
          class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
        >
          <TableCell class="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap align-top">
            {{ rule.ruleCode }}
          </TableCell>
          <TableCell class="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 w-[14rem] max-w-[14rem] whitespace-normal break-words align-top">
            {{ rule.ruleName }}
          </TableCell>
          <TableCell class="px-4 py-3 font-mono text-xs text-[#16659E] dark:text-[#16659E]/80 whitespace-normal break-words align-top">
            {{ rule.featureName }}
          </TableCell>
          <TableCell class="px-2 py-3 whitespace-nowrap align-top w-[4.5rem]">
            <span class="font-mono text-sm font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {{ rule.operator }}
            </span>
          </TableCell>
          <TableCell class="px-2 py-3 text-right font-mono text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300 align-top w-[4rem]">
            {{ rule.thresholdValue }}
          </TableCell>
          <TableCell class="px-2 py-3 whitespace-nowrap align-top w-[5.5rem]">
            <span :class="['px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', severityBadge(rule.severity)]">
              {{ rule.severity }}
            </span>
          </TableCell>
          <TableCell class="px-2 py-3 text-right align-top w-[4.5rem]">
            <span class="font-semibold tabular-nums text-sm text-orange-600 dark:text-orange-400">
              +{{ rule.scoreImpact }}
            </span>
          </TableCell>
          <TableCell class="px-2 py-3 text-center align-top w-[4rem]">
            <span :class="['px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase', enabledBadge(rule.enabled)]">
              {{ rule.enabled ? "Yes" : "No" }}
            </span>
          </TableCell>
          <TableCell class="px-2 py-3 text-right align-top w-[7.5rem]">
            <div class="flex items-center justify-end gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                class="h-8 w-8 p-0"
                :disabled="actionLoading"
                title="Edit rule"
                @click="emit('edit', rule)"
              >
                <Pencil class="h-3.5 w-3.5" />
              </Button>
              <Button
                v-if="rule.enabled"
                type="button"
                size="sm"
                variant="ghost"
                class="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                :disabled="actionLoading"
                title="Disable rule"
                @click="emit('disable', rule)"
              >
                <PowerOff class="h-3.5 w-3.5" />
              </Button>
              <Button
                v-else
                type="button"
                size="sm"
                variant="ghost"
                class="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                :disabled="actionLoading"
                title="Enable rule"
                @click="emit('enable', rule)"
              >
                <Power class="h-3.5 w-3.5" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
