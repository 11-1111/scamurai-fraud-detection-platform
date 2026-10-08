<script setup lang="ts">
import type { TransactionsPageTab } from "../../application/ports/TransactionRepository";
import { cn } from "@/lib/utils";

defineProps<{
  modelValue: TransactionsPageTab;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: TransactionsPageTab];
}>();

const tabs: { value: TransactionsPageTab; label: string }[] = [
  { value: "analytics", label: "Analytics" },
  { value: "all", label: "Transactions" },
  // { value: "pending", label: "Pending Transactions" },
  // { value: "incoming", label: "Incoming Transactions" },
  // { value: "card", label: "Card Transactions" },
];

function select(value: TransactionsPageTab) {
  emit("update:modelValue", value);
}
</script>

<template>
  <div
    role="tablist"
    class="flex gap-8 border-b border-[#E5E9EB] px-1"
  >
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.value"
      :class="cn(
        'py-4 text-sm font-medium transition-colors focus-visible:outline-none',
        modelValue === tab.value
          ? 'border-b-2 border-[#16659E] text-[#16659E] font-bold'
          : 'border-b-2 border-transparent text-[#647887] hover:text-[#16659E]'
      )"
      @click="select(tab.value)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
