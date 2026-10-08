<script setup lang="ts">
import type { FraudAlertTriggeredRule } from "../../domain/entities/FraudAlert";
import { formatLabel } from "./alertBadgeStyles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

defineProps<{
  rules: FraudAlertTriggeredRule[];
}>();
</script>

<template>
  <Card class="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Triggered Rules
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p v-if="!rules?.length" class="text-sm text-slate-500 dark:text-slate-400">
        No triggered rules.
      </p>
      <div v-else class="space-y-4">
        <div
          v-for="(rule, idx) in rules"
          :key="`${rule.ruleCode}-${idx}`"
          class="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ rule.ruleName }}</p>
              <p class="text-xs font-mono text-slate-500 dark:text-slate-400">{{ rule.ruleCode }}</p>
            </div>
            <span class="text-xs font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400">
              {{ formatLabel(rule.severity) }}
            </span>
          </div>
          <dl class="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
            <div>
              <dt class="text-slate-500 dark:text-slate-400">Score Impact</dt>
              <dd class="font-semibold tabular-nums">{{ rule.scoreImpact }}</dd>
            </div>
            <div v-if="rule.featureName">
              <dt class="text-slate-500 dark:text-slate-400">Feature Name</dt>
              <dd class="font-mono">{{ rule.featureName }}</dd>
            </div>
            <div v-if="rule.actualValue != null">
              <dt class="text-slate-500 dark:text-slate-400">Actual Value</dt>
              <dd class="tabular-nums">{{ rule.actualValue }}</dd>
            </div>
            <div v-if="rule.operator">
              <dt class="text-slate-500 dark:text-slate-400">Operator</dt>
              <dd>{{ rule.operator }}</dd>
            </div>
            <div v-if="rule.thresholdValue != null">
              <dt class="text-slate-500 dark:text-slate-400">Threshold</dt>
              <dd class="tabular-nums">{{ rule.thresholdValue }}</dd>
            </div>
          </dl>
          <p v-if="rule.message" class="mt-2 text-xs text-slate-600 dark:text-slate-300">
            {{ rule.message }}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
