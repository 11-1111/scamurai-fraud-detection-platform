<script setup lang="ts">
import { riskLevelBadgeClass, formatLabel } from "./alertBadgeStyles";

defineProps<{ level: string }>();
</script>

<template>
  <span
    :class="[
      'inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide',
      riskLevelBadgeClass(level),
    ]"
  >
    {{ formatLabel(level) }}
  </span>
</template>
