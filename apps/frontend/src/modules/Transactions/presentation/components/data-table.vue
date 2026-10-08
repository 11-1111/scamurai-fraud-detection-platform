<script setup lang="ts">
import { ref, computed } from "vue";
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/vue-table";
import {
  FlexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useVueTable,
} from "@tanstack/vue-table";
import { ChevronDown } from "lucide-vue-next";

import { valueUpdater } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const props = withDefaults(
  defineProps<{
    columns: ColumnDef<any, any>[];
    data: any[];
    /** Total count from server (for server-side pagination) */
    totalRows?: number;
    /** Current 1-based page from server */
    currentPage?: number;
    /** Page size from server */
    pageSize?: number;
    /** Disable pagination buttons while loading */
    isLoading?: boolean;
    /** Options shown in the page size dropdown; default [10, 20, 50, 100] */
    pageSizeOptions?: number[];
  }>(),
  { totalRows: 0, currentPage: 1, pageSize: 10, isLoading: false }
);

const emit = defineEmits<{
  prevPage: [];
  nextPage: [];
  "update:pageSize": [value: number];
}>();

const sizeOptions = computed(() => props.pageSizeOptions ?? [...PAGE_SIZE_OPTIONS]);


const sorting = ref<SortingState>([]);
const columnFilters = ref<ColumnFiltersState>([]);
const columnVisibility = ref<VisibilityState>({});
const rowSelection = ref({});

const table = useVueTable({
  get columns() {
    return props.columns;
  },
  get data() {
    return props.data;
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  onSortingChange: (updaterOrValue) => valueUpdater(updaterOrValue, sorting),
  onColumnFiltersChange: (updaterOrValue) =>
    valueUpdater(updaterOrValue, columnFilters),
  onColumnVisibilityChange: (updaterOrValue) =>
    valueUpdater(updaterOrValue, columnVisibility),
  onRowSelectionChange: (updaterOrValue) =>
    valueUpdater(updaterOrValue, rowSelection),
  state: {
    get sorting() {
      return sorting.value;
    },
    get columnFilters() {
      return columnFilters.value;
    },
    get columnVisibility() {
      return columnVisibility.value;
    },
    get rowSelection() {
      return rowSelection.value;
    },
  },
});

// Server-side pagination: derived state (named to avoid shadowing props)
const totalCount = computed(() => props.totalRows ?? 0);
const pageIndex = computed(() => props.currentPage ?? 1);
const sizePerPage = computed(() => props.pageSize ?? 10);
const startRow = computed(
  () => (pageIndex.value - 1) * sizePerPage.value + 1
);
const endRow = computed(() =>
  Math.min(pageIndex.value * sizePerPage.value, totalCount.value)
);
const hasPrevPage = computed(() => pageIndex.value > 1);
const hasNextPage = computed(
  () => pageIndex.value * sizePerPage.value < totalCount.value
);

</script>

<template>
  
  <div class="w-full min-w-0 space-y-4 font-[Manrope,sans-serif]">
    <div
      class="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:!bg-black/10 !pt-0"
    >
      <!-- Horizontal scroll: table can scroll inside layout without exceeding width -->
      <div class="overflow-x-auto overscroll-x-contain min-w-0">
        <Table class="w-full min-w-max border-collapse">
          <TableHeader>
            <TableRow
              v-for="headerGroup in table.getHeaderGroups()"
              :key="headerGroup.id"
              class="bg-gray-50/50 border-b border-[#E5E9EB]"
            >
              <TableHead
                v-for="header in headerGroup.headers"
                :key="header.id"
                :colSpan="header.colSpan"
                class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#647887] border-b border-[#E5E9EB] whitespace-nowrap"
              >
                <FlexRender
                  v-if="!header.isPlaceholder"
                  :render="header.column.columnDef.header"
                  :props="header.getContext()"
                />
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            <!-- Skeleton loading state -->
            <template v-if="isLoading">
              <TableRow
                v-for="skeletonRow in sizePerPage"
                :key="'skeleton-' + skeletonRow"
                class="border-b border-[#E5E9EB]"
              >
                <TableCell
                  v-for="(_, colIndex) in table.getVisibleLeafColumns().length"
                  :key="'skeleton-' + skeletonRow + '-' + colIndex"
                  class="px-4 py-4"
                >
                  <Skeleton
                    class="h-5 w-full max-w-[120px]"
                    :class="colIndex === 0 ? 'max-w-[140px]' : colIndex === 1 ? 'max-w-[160px]' : ''"
                  />
                </TableCell>
              </TableRow>
            </template>

            <!-- Data rows -->
            <template v-else-if="table.getRowModel().rows?.length">
              <TableRow
                v-for="row in table.getRowModel().rows"
                :key="row.id"
                :data-state="row.getIsSelected() && 'selected'"
                class="hover:bg-gray-50 transition-colors border-b border-[#E5E9EB]"
              >
                <TableCell
                  v-for="cell in row.getVisibleCells()"
                  :key="cell.id"
                  class="px-4 py-4 text-sm text-[#374151] whitespace-nowrap"
                >
                  <FlexRender
                    :render="cell.column.columnDef.cell"
                    :props="cell.getContext()"
                  />
                </TableCell>
              </TableRow>
            </template>

            <TableRow v-else>
              <TableCell
                :colspan="
                  Math.max(1, table.getVisibleLeafColumns().length)
                "
                class="h-24 text-center text-[#647887]"
              >
                No results.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Pagination Footer (server-side) -->
      <div
        class="px-6 py-4 border-t border-[#E5E9EB] flex flex-wrap items-center justify-between gap-4 bg-gray-50/30"
      >
        <div class="flex flex-wrap items-center gap-4">
          <!-- Page size dropdown -->
          <div class="flex items-center gap-2">
            <span class="text-sm text-[#647887] whitespace-nowrap">Rows per page</span>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="isLoading"
                  class="h-8 min-w-[4.5rem] justify-between gap-1 border-[#E5E9EB] bg-white text-[#374151] hover:bg-gray-50 disabled:opacity-50"
                >
                  {{ sizePerPage }}
                  <ChevronDown class="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" class="min-w-[4.5rem]">
                <DropdownMenuItem
                  v-for="opt in sizeOptions"
                  :key="opt"
                  :class="{ 'bg-accent': sizePerPage === opt }"
                  @select="emit('update:pageSize', opt)"
                >
                  {{ opt }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p class="text-sm text-[#647887]">
            Showing {{ totalCount ? `${startRow}–${endRow} of ${totalCount}` : `${table.getRowModel().rows.length} transactions` }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="!hasPrevPage || isLoading"
            class="px-3 py-1 text-sm border border-[#E5E9EB] rounded hover:bg-white bg-gray-50 text-[#374151] disabled:opacity-50"
            @click="emit('prevPage')"
          >
            Previous
          </Button>

          <span
            class="px-3 py-1 text-sm bg-[#16659E] text-white rounded font-medium"
          >
            {{ pageIndex }}
          </span>

          <Button
            variant="outline"
            size="sm"
            :disabled="!hasNextPage || isLoading"
            class="px-3 py-1 text-sm border border-[#E5E9EB] rounded hover:bg-white bg-gray-50 text-[#374151] disabled:opacity-50"
            @click="emit('nextPage')"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
