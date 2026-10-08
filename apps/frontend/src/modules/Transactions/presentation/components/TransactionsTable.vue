<script setup lang="ts">
import { computed } from "vue";
import type { Transaction } from "../../domain/entities/Transaction";
import { createTransactionColumns } from "./transactions-columns";
import DataTable from "./data-table.vue";

const props = defineProps<{
  data: Transaction[];
  total: number;
  currentPage: number;
  pageSize: number;
  isLoading?: boolean;
  pageSizeOptions?: number[];
}>();

const emit = defineEmits<{
  prevPage: [];
  nextPage: [];
  "update:pageSize": [value: number];
  view: [transaction: Transaction];
}>();

const columns = computed(() =>
  createTransactionColumns({
    onView: (transaction) => emit("view", transaction),
  })
);
</script>

<template>
  <DataTable
    :columns="columns"
    :data="data ?? []"
    :total-rows="total"
    :current-page="currentPage"
    :page-size="pageSize"
    :is-loading="isLoading"
    :page-size-options="pageSizeOptions"
    @prev-page="emit('prevPage')"
    @next-page="emit('nextPage')"
    @update:page-size="(v) => emit('update:pageSize', v)"
  />
</template>
