<script setup lang="ts">
import { computed } from "vue";
import type { FraudAlertHistoryItem } from "../../domain/entities/FraudAlert";
import {
  actionTypeBadgeClass,
  actionTypeLabel,
  formatDate,
  formatLabel,
} from "./alertBadgeStyles";
import FraudAlertStatusBadge from "./FraudAlertStatusBadge.vue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const props = defineProps<{
  history: FraudAlertHistoryItem[];
}>();

const sortedHistory = computed(() =>
  [...(props.history ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
);

const hasHistory = computed(() => sortedHistory.value.length > 0);

function hasStatusChange(item: FraudAlertHistoryItem): boolean {
  return Boolean(item.previousStatus || item.newStatus);
}

function hasAssigneeChange(item: FraudAlertHistoryItem): boolean {
  return Boolean(item.previousAssignee || item.newAssignee);
}
</script>

<template>
  <Card class="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Alert History
      </CardTitle>
      <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        Audit trail of lifecycle changes, assignments, notes, and resolutions.
      </p>
    </CardHeader>
    <CardContent>
      <p v-if="!hasHistory" class="text-sm text-slate-500 dark:text-slate-400">
        No alert history available.
      </p>

      <ol v-else class="relative space-y-0">
        <li
          v-for="(item, index) in sortedHistory"
          :key="item.id"
          class="relative pl-8 pb-8 last:pb-0"
        >
          <span
            v-if="index < sortedHistory.length - 1"
            class="absolute left-[11px] top-6 bottom-0 w-px bg-slate-200 dark:bg-slate-700"
            aria-hidden="true"
          />
          <span
            class="absolute left-0 top-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            aria-hidden="true"
          >
            <span class="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
          </span>

          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <span
                :class="[
                  'inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide',
                  actionTypeBadgeClass(item.actionType),
                ]"
              >
                {{ actionTypeLabel(item.actionType) }}
              </span>
              <span class="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {{ formatDate(item.createdAt) }}
              </span>
            </div>

            <p v-if="item.performedBy" class="text-xs text-slate-600 dark:text-slate-300">
              By <span class="font-medium">{{ item.performedBy }}</span>
            </p>

            <div
              v-if="hasStatusChange(item)"
              class="flex flex-wrap items-center gap-2 text-xs"
            >
              <span class="text-slate-500 dark:text-slate-400">Status:</span>
              <FraudAlertStatusBadge
                v-if="item.previousStatus"
                :status="item.previousStatus"
              />
              <span v-if="item.previousStatus && item.newStatus" class="text-slate-400">→</span>
              <FraudAlertStatusBadge
                v-if="item.newStatus"
                :status="item.newStatus"
              />
            </div>

            <div
              v-if="hasAssigneeChange(item)"
              class="text-xs text-slate-600 dark:text-slate-300"
            >
              <span class="text-slate-500 dark:text-slate-400">Assignee:</span>
              {{ item.previousAssignee || "—" }}
              <span class="mx-1 text-slate-400">→</span>
              {{ item.newAssignee || "—" }}
            </div>

            <p v-if="item.resolution" class="text-xs text-slate-600 dark:text-slate-300">
              <span class="text-slate-500 dark:text-slate-400">Resolution:</span>
              {{ formatLabel(item.resolution) }}
            </p>

            <p
              v-if="item.comment"
              class="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap"
            >
              {{ item.comment }}
            </p>
          </div>
        </li>
      </ol>
    </CardContent>
  </Card>
</template>
