<script setup lang="ts">
import { decisionBadgeClass, formatLabel } from "./alertBadgeStyles";

defineProps<{ decision: string }>();
</script>

<template>
  <span
    :class="[
      'inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide',
      decisionBadgeClass(decision),
    ]"
  >
    {{ formatLabel(decision) }}
  </span>
</template>
