<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@/lib/utils";

interface Props {
  modelValue?: boolean;
  disabled?: boolean;
  class?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const checked = computed({
  get: () => props.modelValue ?? false,
  set: (val) => emit("update:modelValue", val),
});
</script>

<template>
  <label
    :class="
      cn(
        'peer inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
        props.class
      )
    "
    :data-state="checked ? 'checked' : 'unchecked'"
  >
    <input
      v-model="checked"
      type="checkbox"
      :disabled="disabled"
      :aria-label="ariaLabel"
      class="sr-only"
    />
    <svg
      v-if="checked"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-4 w-4"
    >
      <path d="M5 12l5 5l10 -10" />
    </svg>
  </label>
</template>

