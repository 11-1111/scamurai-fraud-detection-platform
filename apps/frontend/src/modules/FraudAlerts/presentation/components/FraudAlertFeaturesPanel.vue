<script setup lang="ts">
import { computed } from "vue";
import type { FeatureSnapshot } from "../../domain/entities/FraudAlert";
import { formatFeatureKey } from "./alertBadgeStyles";
import { formatDateTime } from "@/lib/formatDateTime";
import { formatFeatureDisplayValue } from "../utils/formatFeatureValue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const props = defineProps<{
  features: FeatureSnapshot[] | Record<string, number | string | boolean | null>;
}>();

const snapshots = computed((): FeatureSnapshot[] => {
  if (Array.isArray(props.features)) return props.features;
  return Object.entries(props.features ?? {}).map(([key, value]) => ({
    featureName: key,
    label: formatFeatureKey(key),
    description: "",
    category: "General",
    value,
    valueType: value == null ? "null" : typeof value,
    unit: null,
    windowSeconds: null,
    calculatedAt: null,
  }));
});

const grouped = computed(() => {
  const groups: Record<string, FeatureSnapshot[]> = {};
  for (const f of snapshots.value) {
    const cat = f.category || "General";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(f);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
});

const hasFeatures = computed(() => snapshots.value.length > 0);

function formatWindow(seconds?: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}
</script>

<template>
  <Card class="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Feature Snapshot
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p v-if="!hasFeatures" class="text-sm text-slate-500 dark:text-slate-400">
        No feature values available.
      </p>
      <div v-else class="space-y-5">
        <div v-for="[category, items] in grouped" :key="category">
          <h3 class="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            {{ category }}
          </h3>
          <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="item in items"
              :key="item.featureName"
              class="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-3 py-2"
            >
              <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">
                {{ item.label || formatFeatureKey(item.featureName) }}
              </dt>
              <dd class="mt-0.5 text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                {{ formatFeatureDisplayValue(item.value, item.valueType) }}
                <span v-if="item.unit" class="text-xs font-normal text-slate-500 ml-1">{{ item.unit }}</span>
              </dd>
              <p class="mt-1 text-[10px] text-slate-400">
                Window: {{ formatWindow(item.windowSeconds) }}
                <span v-if="item.calculatedAt"> · {{ formatDateTime(item.calculatedAt) }}</span>
              </p>
            </div>
          </dl>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
