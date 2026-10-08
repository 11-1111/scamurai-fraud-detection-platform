<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";
import type { NodeProps } from "@vue-flow/core";
import { computed } from "vue";
import type { FraudFlowNodeData } from "../../../application/mappers/graphMapper";
import { getNodeStyle } from "./fraudGraphNodeStyles";

const props = defineProps<NodeProps<FraudFlowNodeData>>();

const style = computed(() => getNodeStyle(props.data.type));
</script>

<template>
  <div
    class="fraud-graph-node group relative min-w-[160px] max-w-[220px] rounded-lg border px-3 py-2 shadow-sm"
    :class="style.container"
  >
    <Handle type="target" :position="Position.Top" class="!bg-slate-400 dark:!bg-slate-500" />

    <!-- Hover tooltip -->
    <div
      class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-max max-w-[240px] -translate-x-1/2 rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-left shadow-lg group-hover:block dark:border-slate-600 dark:bg-slate-800"
    >
      <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
        {{ data.type }}
      </p>
      <p class="mt-0.5 text-xs text-white break-all">{{ data.label }}</p>
      <p class="mt-1 font-mono text-[10px] text-slate-400 break-all">{{ id }}</p>
    </div>

    <p class="text-[10px] font-bold uppercase tracking-wide" :class="style.typeText">
      {{ data.type }}
    </p>
    <p class="mt-1 text-xs font-medium leading-snug break-all" :class="style.labelText">
      {{ data.label }}
    </p>

    <Handle type="source" :position="Position.Bottom" class="!bg-slate-400 dark:!bg-slate-500" />
  </div>
</template>
