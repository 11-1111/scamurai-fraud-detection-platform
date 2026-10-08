<script setup lang="ts">
import type { TriggeredRule } from "../../../domain/entities/Transaction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

defineProps<{
  rules?: TriggeredRule[];
}>();

function severityClasses(severity: string): string {
  switch (severity?.toUpperCase()) {
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

function severityBorder(severity: string): string {
  switch (severity?.toUpperCase()) {
    case "LOW": return "border-l-green-400";
    case "MEDIUM": return "border-l-amber-400";
    case "HIGH": return "border-l-orange-500";
    case "CRITICAL": return "border-l-red-600";
    default: return "border-l-slate-300";
  }
}
</script>

<template>
  <Card
    class="w-full border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-sm"
  >
    <CardHeader class="pb-3">
      <div class="flex items-center gap-2">
        <div
          class="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20"
        >
          <svg
            class="w-4 h-4 text-orange-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <CardTitle class="text-sm font-semibold text-[#414141] dark:text-[#F9FBFC]">
          Triggered Rules
        </CardTitle>
        <span
          v-if="rules?.length"
          class="ml-auto text-[10px] font-bold tabular-nums px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
        >
          {{ rules.length }}
        </span>
      </div>
    </CardHeader>

    <CardContent>
      <p v-if="!rules?.length" class="text-sm text-slate-500 dark:text-slate-400 py-3">
        No fraud rules triggered.
      </p>

      <ul v-else class="space-y-3">
        <li
          v-for="(rule, i) in rules"
          :key="`rule-${i}`"
          :class="[
            'rounded-md border border-l-4 border-slate-200/60 dark:border-slate-700/50 p-3 bg-slate-50 dark:bg-slate-800/40',
            severityBorder(rule.severity),
          ]"
        >
          <!-- Rule name + severity badge -->
          <div class="flex items-start justify-between gap-2">
            <span class="text-sm font-semibold text-[#414141] dark:text-[#F9FBFC] leading-snug">
              {{ rule.ruleName }}
            </span>
            <span
              :class="[
                'shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide',
                severityClasses(rule.severity),
              ]"
            >
              {{ rule.severity }}
            </span>
          </div>

          <!-- Why it triggered — feature evidence -->
          <div
            v-if="rule.featureName != null && rule.featureValue != null"
            class="mt-2 flex flex-wrap items-center gap-1.5 p-2 rounded-md bg-orange-50/60 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30"
          >
            <span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Why:
            </span>
            <code class="text-xs font-mono font-bold text-[#16659E] dark:text-[#16659E]/80">
              {{ rule.featureName }}
            </code>
            <span class="text-xs font-bold text-slate-500 dark:text-slate-400">
              value
            </span>
            <span class="text-sm font-black tabular-nums text-orange-600 dark:text-orange-400">
              {{ rule.featureValue }}
            </span>
            <span
              v-if="rule.operator"
              class="text-xs font-bold text-slate-400 dark:text-slate-500 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono"
            >
              {{ rule.operator }}
            </span>
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">threshold</span>
            <span
              v-if="rule.thresholdValue != null"
              class="text-sm font-black tabular-nums text-slate-600 dark:text-slate-300"
            >
              {{ rule.thresholdValue }}
            </span>
          </div>

          <!-- Full message -->
          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
            {{ rule.message }}
          </p>

          <!-- Meta row -->
          <div class="flex items-center gap-3 mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/30">
            <span class="text-[10px] font-mono text-slate-400 dark:text-slate-500">
              {{ rule.ruleCode }}
            </span>
            <span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              Score impact:
              <span class="text-orange-600 dark:text-orange-400">+{{ rule.scoreImpact }}</span>
            </span>
          </div>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
