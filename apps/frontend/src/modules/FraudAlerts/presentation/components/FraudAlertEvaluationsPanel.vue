<script setup lang="ts">
import type { FraudEvaluation } from "../../domain/entities/FraudAlert";
import FraudAlertRiskBadge from "./FraudAlertRiskBadge.vue";
import FraudAlertDecisionBadge from "./FraudAlertDecisionBadge.vue";
import { formatDate } from "./alertBadgeStyles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

defineProps<{
  evaluations: FraudEvaluation[];
  selectedId?: string | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  select: [evaluationId: string];
}>();
</script>

<template>
  <Card class="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Evaluation History
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p v-if="!evaluations?.length" class="text-sm text-slate-500 dark:text-slate-400">
        No evaluation history available.
      </p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="text-left text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <th class="py-2 pr-3 font-semibold">Version</th>
              <th class="py-2 pr-3 font-semibold">Reason</th>
              <th class="py-2 pr-3 font-semibold">Status</th>
              <th class="py-2 pr-3 font-semibold text-right">Score</th>
              <th class="py-2 pr-3 font-semibold">Risk</th>
              <th class="py-2 pr-3 font-semibold">Decision</th>
              <th class="py-2 pr-3 font-semibold">Started</th>
              <th class="py-2 pr-3 font-semibold">Completed</th>
              <th class="py-2 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ev in evaluations"
              :key="ev.id"
              class="border-b border-slate-50 dark:border-slate-800/60"
              :class="selectedId === ev.id ? 'bg-slate-50 dark:bg-slate-800/40' : ''"
            >
              <td class="py-2 pr-3 tabular-nums">{{ ev.evaluationVersion ?? "—" }}</td>
              <td class="py-2 pr-3 max-w-[140px] truncate" :title="ev.evaluationReason ?? ''">
                {{ ev.evaluationReason || "—" }}
              </td>
              <td class="py-2 pr-3">{{ ev.status || "—" }}</td>
              <td class="py-2 pr-3 text-right font-semibold tabular-nums">{{ ev.riskScore }}</td>
              <td class="py-2 pr-3"><FraudAlertRiskBadge :level="ev.riskLevel" /></td>
              <td class="py-2 pr-3"><FraudAlertDecisionBadge :decision="ev.policyDecision" /></td>
              <td class="py-2 pr-3 whitespace-nowrap tabular-nums">{{ formatDate(ev.startedAt) }}</td>
              <td class="py-2 pr-3 whitespace-nowrap tabular-nums">{{ formatDate(ev.completedAt) }}</td>
              <td class="py-2 text-right">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  class="h-7"
                  :disabled="loading || selectedId === ev.id"
                  :aria-label="`Load evaluation ${ev.id}`"
                  @click="emit('select', ev.id)"
                >
                  {{ selectedId === ev.id ? "Selected" : "View" }}
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
</template>
