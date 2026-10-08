<script setup lang="ts">
import { statusBadgeClass, formatLabel } from "./alertBadgeStyles";

defineProps<{ status: string }>();
</script>

<template>
  <span
    :class="[
      'inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide',
      statusBadgeClass(status),
    ]"
  >
    {{ formatLabel(status) }}
  </span>
</template>
