<script setup lang="ts">
import type { FraudAlertPolicyAction } from "../../domain/entities/FraudAlert";
import FraudAlertDecisionBadge from "./FraudAlertDecisionBadge.vue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

defineProps<{
  policies: FraudAlertPolicyAction[];
}>();
</script>

<template>
  <Card class="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Policy Actions
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p v-if="!policies?.length" class="text-sm text-slate-500 dark:text-slate-400">
        No policy actions matched.
      </p>
      <div v-else class="space-y-3">
        <div
          v-for="(policy, idx) in policies"
          :key="`${policy.policyCode}-${idx}`"
          class="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ policy.policyName }}</p>
              <p class="text-xs font-mono text-slate-500 dark:text-slate-400">{{ policy.policyCode }}</p>
            </div>
            <FraudAlertDecisionBadge :decision="policy.decision" />
          </div>
          <dl class="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt class="text-slate-500 dark:text-slate-400">Action Label</dt>
              <dd class="font-medium">{{ policy.actionLabel }}</dd>
            </div>
            <div>
              <dt class="text-slate-500 dark:text-slate-400">Priority</dt>
              <dd class="tabular-nums font-semibold">{{ policy.priority }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
