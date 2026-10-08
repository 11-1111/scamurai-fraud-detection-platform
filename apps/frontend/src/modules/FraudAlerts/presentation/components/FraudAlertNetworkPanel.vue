<script setup lang="ts">
import type { FraudAlertGraph } from "../../domain/entities/FraudAlert";
import type { FraudGraph } from "@/modules/Transactions/domain/entities/Transaction";
import FraudNetworkPanel from "@/modules/Transactions/presentation/components/fraud/FraudNetworkPanel.vue";
import { computed } from "vue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const props = defineProps<{
  graph?: FraudAlertGraph;
}>();

const fraudGraph = computed((): FraudGraph | undefined => {
  if (!props.graph) return undefined;
  return {
    nodes: props.graph.nodes,
    edges: props.graph.edges,
  };
});

const nodes = computed(() => props.graph?.nodes ?? []);
const edges = computed(() => props.graph?.edges ?? []);

const groupedNodes = computed(() => {
  const groups: Record<string, typeof nodes.value> = {};
  for (const node of nodes.value) {
    const type = node.type || "Unknown";
    if (!groups[type]) groups[type] = [];
    groups[type].push(node);
  }
  return groups;
});

const previewEdges = computed(() => edges.value.slice(0, 10));

const useVueFlow = computed(() => nodes.value.length > 0);
</script>

<template>
  <FraudNetworkPanel v-if="useVueFlow" :graph="fraudGraph" />

  <Card
    v-else
    class="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
  >
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Fraud Network
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p v-if="!graph || (nodes.length === 0 && edges.length === 0)" class="text-sm text-slate-500 dark:text-slate-400">
        No network graph data available.
      </p>
      <div v-else class="space-y-4 text-sm">
        <div class="flex flex-wrap gap-4">
          <div class="rounded-lg border border-slate-100 dark:border-slate-800 px-4 py-2">
            <p class="text-xs text-slate-500 dark:text-slate-400">Nodes</p>
            <p class="text-lg font-bold tabular-nums">{{ nodes.length }}</p>
          </div>
          <div class="rounded-lg border border-slate-100 dark:border-slate-800 px-4 py-2">
            <p class="text-xs text-slate-500 dark:text-slate-400">Edges</p>
            <p class="text-lg font-bold tabular-nums">{{ edges.length }}</p>
          </div>
        </div>

        <div v-if="Object.keys(groupedNodes).length">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            Grouped Nodes
          </p>
          <div class="space-y-2">
            <div
              v-for="(group, type) in groupedNodes"
              :key="type"
              class="rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2"
            >
              <p class="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {{ type }} ({{ group.length }})
              </p>
              <ul class="mt-1 text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                <li v-for="node in group.slice(0, 5)" :key="node.id" class="truncate font-mono">
                  {{ node.label || node.id }}
                </li>
                <li v-if="group.length > 5" class="italic">+ {{ group.length - 5 }} more</li>
              </ul>
            </div>
          </div>
        </div>

        <div v-if="previewEdges.length">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            Relationships (first {{ previewEdges.length }})
          </p>
          <ul class="space-y-1 text-xs font-mono text-slate-600 dark:text-slate-300">
            <li v-for="edge in previewEdges" :key="edge.id" class="truncate">
              {{ edge.source }} → {{ edge.target }}
              <span v-if="edge.label" class="text-slate-400">({{ edge.label }})</span>
            </li>
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
