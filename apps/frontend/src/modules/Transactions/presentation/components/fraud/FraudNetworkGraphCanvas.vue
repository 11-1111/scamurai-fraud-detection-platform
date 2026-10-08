<script setup lang="ts">
import { VueFlow, useVueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import type { Edge, Node } from "@vue-flow/core";
import { markRaw, nextTick, ref, watch } from "vue";
import FraudGraphNode from "./FraudGraphNode.vue";
import type { FraudFlowNodeData } from "../../../application/mappers/graphMapper";

const props = defineProps<{
  nodes: Node<FraudFlowNodeData>[];
  edges: Edge[];
}>();

const emit = defineEmits<{
  nodeSelect: [nodeId: string];
}>();

const nodeTypes = { fraud: markRaw(FraudGraphNode) };
const { fitView } = useVueFlow();

const flowNodes = ref<Node<FraudFlowNodeData>[]>([]);
const flowEdges = ref<Edge[]>([]);

watch(
  () => props.nodes,
  (nodes) => {
    flowNodes.value = nodes.map((node) => ({ ...node }));
  },
  { immediate: true, deep: true }
);

watch(
  () => props.edges,
  (edges) => {
    flowEdges.value = edges.map((edge) => ({ ...edge }));
  },
  { immediate: true, deep: true }
);

async function applyFitView() {
  if (flowNodes.value.length === 0) return;
  await nextTick();
  fitView({ padding: 0.18, duration: 300 });
}

watch(
  () => props.nodes,
  () => applyFitView(),
  { deep: true }
);

function onNodeClick(event: { node: Node<FraudFlowNodeData> }) {
  emit("nodeSelect", event.node.id);
}
</script>

<template>
  <VueFlow
    v-model:nodes="flowNodes"
    v-model:edges="flowEdges"
    :node-types="nodeTypes"
    :nodes-draggable="true"
    :nodes-connectable="false"
    :elements-selectable="false"
    :multi-selection-key-code="null"
    :selection-key-code="null"
    :delete-key-code="null"
    :fit-view-on-init="true"
    :min-zoom="0.2"
    :max-zoom="2"
    class="fraud-network-flow h-full w-full"
    @node-click="onNodeClick"
    @nodes-initialized="applyFitView"
  >
    <Background :gap="16" pattern-color="currentColor" class="!text-slate-200 dark:!text-slate-700" />
    <Controls />
    <MiniMap
      :node-stroke-width="3"
      class="!bg-white/90 dark:!bg-slate-900/90 !border-slate-200 dark:!border-slate-700"
    />
  </VueFlow>
</template>

<style scoped>
.fraud-network-flow :deep(.vue-flow__edge-text) {
  font-size: 10px;
  font-weight: 600;
  fill: rgb(100 116 139);
}

:global(.dark) .fraud-network-flow :deep(.vue-flow__edge-text) {
  fill: rgb(148 163 184);
}

.fraud-network-flow :deep(.vue-flow__edge-textbg) {
  fill: rgb(248 250 252);
  fill-opacity: 0.92;
}

:global(.dark) .fraud-network-flow :deep(.vue-flow__edge-textbg) {
  fill: rgb(15 23 42);
  fill-opacity: 0.92;
}

.fraud-network-flow :deep(.vue-flow__controls) {
  box-shadow: none;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.5rem;
  overflow: hidden;
}

:global(.dark) .fraud-network-flow :deep(.vue-flow__controls) {
  border-color: rgb(51 65 85);
}

.fraud-network-flow :deep(.vue-flow__controls-button) {
  background: rgb(248 250 252);
  border-bottom: 1px solid rgb(226 232 240);
  fill: rgb(71 85 105);
}

:global(.dark) .fraud-network-flow :deep(.vue-flow__controls-button) {
  background: rgb(15 23 42);
  border-bottom-color: rgb(51 65 85);
  fill: rgb(148 163 184);
}
</style>
