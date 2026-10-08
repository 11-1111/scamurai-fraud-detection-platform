<script setup lang="ts">
import type { FraudGraph, FraudGraphEdge, FraudGraphNode } from "../../../domain/entities/Transaction";
import { mapGraph } from "../../../application/mappers/graphMapper";
import { LEGEND_ITEMS } from "./fraudGraphNodeStyles";
import FraudNetworkGraphCanvas from "./FraudNetworkGraphCanvas.vue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computed, ref } from "vue";

const props = defineProps<{
  graph?: FraudGraph;
}>();

const selectedNodeId = ref<string | null>(null);

const mappedGraph = computed(() => mapGraph(props.graph));

const apiNodes = computed((): FraudGraphNode[] => props.graph?.nodes ?? []);
const apiEdges = computed((): FraudGraphEdge[] => props.graph?.edges ?? []);

const isGraphMissing = computed(() => props.graph == null);
const isEmpty = computed(() => apiNodes.value.length === 0);
const hasIsolatedNodes = computed(
  () => apiNodes.value.length > 0 && apiEdges.value.length === 0
);

const selectedNode = computed((): FraudGraphNode | null => {
  if (!selectedNodeId.value) return null;
  return apiNodes.value.find((n) => n.id === selectedNodeId.value) ?? null;
});

const connectedEdges = computed((): FraudGraphEdge[] => {
  if (!selectedNodeId.value) return [];
  return apiEdges.value.filter(
    (e) => e.source === selectedNodeId.value || e.target === selectedNodeId.value
  );
});

const nodeDegree = computed(() => connectedEdges.value.length);

function onNodeSelect(nodeId: string) {
  selectedNodeId.value = nodeId;
}

function closeSelectionPanel() {
  selectedNodeId.value = null;
}
</script>

<template>
  <Card
    class="w-full border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-sm"
  >
    <CardHeader class="pb-3">
      <div class="flex items-start gap-2">
        <div
          class="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/20 shrink-0"
        >
          <svg
            class="w-4 h-4 text-teal-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
            />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <CardTitle class="text-sm font-semibold text-[#414141] dark:text-[#F9FBFC]">
            Fraud Network
          </CardTitle>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Interactive visualization of relationships between identifiers, transactions and
            merchants.
          </p>
        </div>
        <div v-if="!isGraphMissing && !isEmpty" class="ml-auto flex items-center gap-2 shrink-0">
          <span
            class="text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
          >
            {{ apiNodes.length }} nodes
          </span>
          <span
            class="text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          >
            {{ apiEdges.length }} relationships
          </span>
        </div>
      </div>
    </CardHeader>

    <CardContent>
      <!-- Graph missing -->
      <div
        v-if="isGraphMissing"
        class="flex flex-col items-center justify-center py-8 gap-2 text-center"
      >
        <p class="text-sm text-slate-500 dark:text-slate-400">No fraud graph available.</p>
      </div>

      <!-- No nodes -->
      <div
        v-else-if="isEmpty"
        class="flex flex-col items-center justify-center py-8 gap-2 text-center"
      >
        <svg
          class="w-10 h-10 text-slate-300 dark:text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
          />
        </svg>
        <p class="text-sm text-slate-500 dark:text-slate-400">No graph relationships found.</p>
      </div>

      <!-- Interactive graph -->
      <div v-else class="space-y-3">
        <!-- Legend -->
        <div
          class="flex flex-wrap gap-x-4 gap-y-2 rounded-md border border-slate-200/70 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/40 px-3 py-2"
        >
          <div
            v-for="item in LEGEND_ITEMS"
            :key="item.legendLabel"
            class="flex items-center gap-1.5"
          >
            <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="item.legendDot" />
            <span class="text-[11px] text-slate-600 dark:text-slate-300">{{ item.legendLabel }}</span>
          </div>
        </div>

        <!-- Isolated nodes warning -->
        <div
          v-if="hasIsolatedNodes"
          class="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800/40 dark:bg-amber-950/30"
        >
          <svg
            class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <p class="text-xs text-amber-800 dark:text-amber-200">
            Graph contains isolated identifiers.
          </p>
        </div>

        <!-- Graph + selection panel -->
        <div class="relative flex flex-col lg:flex-row gap-3">
          <div
            class="relative flex-1 min-w-0 rounded-lg border border-slate-200/70 dark:border-slate-700/60 overflow-hidden bg-slate-50/50 dark:bg-slate-950/50 h-[400px] md:h-[550px] lg:h-[700px]"
          >
            <FraudNetworkGraphCanvas
              :nodes="mappedGraph.nodes"
              :edges="mappedGraph.edges"
              @node-select="onNodeSelect"
            />
          </div>

          <!-- Selection panel -->
          <aside
            v-if="selectedNode"
            class="w-full lg:w-72 shrink-0 rounded-lg border border-slate-200/70 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/80 p-4 space-y-4"
          >
            <div class="flex items-start justify-between gap-2">
              <h4 class="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Node Details
              </h4>
              <button
                type="button"
                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close panel"
                @click="closeSelectionPanel"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <dl class="space-y-3 text-sm">
              <div>
                <dt class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Node Type</dt>
                <dd class="mt-0.5 font-medium text-slate-800 dark:text-slate-100">{{ selectedNode.type }}</dd>
              </div>
              <div>
                <dt class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Node Value</dt>
                <dd class="mt-0.5 font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
                  {{ selectedNode.label }}
                </dd>
              </div>
              <div>
                <dt class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Neo4j Id</dt>
                <dd class="mt-0.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all">
                  {{ selectedNode.id }}
                </dd>
              </div>
              <div>
                <dt class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Degree
                  <span class="ml-1 font-normal normal-case">({{ nodeDegree }})</span>
                </dt>
              </div>
              <div>
                <dt class="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                  Connected Edges
                </dt>
                <dd>
                  <ul v-if="connectedEdges.length" class="space-y-1.5 max-h-40 overflow-y-auto">
                    <li
                      v-for="edge in connectedEdges"
                      :key="edge.id"
                      class="rounded border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800/60 px-2 py-1.5"
                    >
                      <p class="text-[11px] font-semibold text-[#16659E] dark:text-[#D5EBFB]">
                        {{ edge.label }}
                      </p>
                      <p class="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {{ edge.source }} → {{ edge.target }}
                      </p>
                    </li>
                  </ul>
                  <p v-else class="text-xs text-slate-500 dark:text-slate-400">No connected edges.</p>
                </dd>
              </div>
            </dl>

            <p class="text-[11px] italic text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-700 pt-3">
              Related transactions coming soon.
            </p>
          </aside>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
