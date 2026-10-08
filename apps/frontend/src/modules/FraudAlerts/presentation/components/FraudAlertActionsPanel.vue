<script setup lang="ts">
import { ref, watch } from "vue";
import type { FraudAlertDetail } from "../../domain/entities/FraudAlert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLabel } from "./alertBadgeStyles";

const props = defineProps<{
  alert: FraudAlertDetail;
  loading?: boolean;
}>();

const emit = defineEmits<{
  assign: [payload: { assignedTo: string; comment?: string; performedBy?: string }];
  "status-change": [payload: { status: string; comment?: string; performedBy?: string }];
  resolve: [payload: { resolution: string; note?: string; resolvedBy?: string }];
}>();

const assignedTo = ref(props.alert.assignedTo ?? "");
const assignComment = ref("");
const assignPerformedBy = ref("");

const status = ref(props.alert.alertStatus);
const statusComment = ref("");
const statusPerformedBy = ref("");

const resolution = ref("");
const resolutionNote = ref("");
const resolvedBy = ref("");

watch(
  () => props.alert,
  (a) => {
    assignedTo.value = a.assignedTo ?? "";
    status.value = a.alertStatus;
  },
  { deep: true }
);

const statusOptions = ["OPEN", "ASSIGNED", "UNDER_REVIEW", "RESOLVED", "CLOSED", "DISMISSED"];
const resolutionOptions = [
  "CONFIRMED_FRAUD",
  "FALSE_POSITIVE",
  "DUPLICATE",
  "INSUFFICIENT_EVIDENCE",
  "CUSTOMER_CONFIRMED",
  "MERCHANT_CONFIRMED",
];

function onAssign() {
  if (!assignedTo.value.trim()) return;
  emit("assign", {
    assignedTo: assignedTo.value.trim(),
    comment: assignComment.value.trim() || undefined,
    performedBy: assignPerformedBy.value.trim() || undefined,
  });
  assignComment.value = "";
}

function onStatusChange() {
  emit("status-change", {
    status: status.value,
    comment: statusComment.value.trim() || undefined,
    performedBy: statusPerformedBy.value.trim() || undefined,
  });
  statusComment.value = "";
}

function onResolve() {
  if (!resolution.value) return;
  emit("resolve", {
    resolution: resolution.value,
    note: resolutionNote.value.trim() || undefined,
    resolvedBy: resolvedBy.value.trim() || undefined,
  });
}
</script>

<template>
  <Card class="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Alert Actions
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-6">
      <div class="space-y-2">
        <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Assign To
        </label>
        <Input v-model="assignedTo" placeholder="Analyst email or name..." />
        <textarea
          v-model="assignComment"
          rows="2"
          placeholder="Comment (optional)…"
          class="flex w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm dark:bg-slate-950 resize-y min-h-[60px]"
        />
        <Input v-model="assignPerformedBy" placeholder="Performed by (optional)…" />
        <Button type="button" size="sm" :disabled="loading" @click="onAssign">Assign</Button>
      </div>

      <div class="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
        <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Update Status
        </label>
        <select
          v-model="status"
          class="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm dark:bg-slate-950"
        >
          <option v-for="opt in statusOptions" :key="opt" :value="opt">
            {{ formatLabel(opt) }}
          </option>
        </select>
        <textarea
          v-model="statusComment"
          rows="2"
          placeholder="Comment (optional)…"
          class="flex w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm dark:bg-slate-950 resize-y min-h-[60px]"
        />
        <Input v-model="statusPerformedBy" placeholder="Performed by (optional)…" />
        <Button type="button" size="sm" variant="outline" :disabled="loading" @click="onStatusChange">
          Update Status
        </Button>
      </div>

      <div class="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
        <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Resolve Alert
        </label>
        <select
          v-model="resolution"
          class="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm dark:bg-slate-950"
        >
          <option value="">Select resolution…</option>
          <option v-for="opt in resolutionOptions" :key="opt" :value="opt">
            {{ formatLabel(opt) }}
          </option>
        </select>
        <textarea
          v-model="resolutionNote"
          rows="3"
          placeholder="Resolution note (optional)…"
          class="flex w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm dark:bg-slate-950 resize-y min-h-[80px]"
        />
        <Input v-model="resolvedBy" placeholder="Resolved by (optional)…" />
        <Button type="button" size="sm" :disabled="loading || !resolution" @click="onResolve">
          Resolve Alert
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
