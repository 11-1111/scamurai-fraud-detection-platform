<script setup lang="ts">
import { ref } from "vue";
import type { FraudAlertNote } from "../../domain/entities/FraudAlert";
import { formatDate } from "./alertBadgeStyles";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

defineProps<{
  notes: FraudAlertNote[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  "add-note": [payload: { note: string; createdBy?: string }];
}>();

const noteText = ref("");
const createdBy = ref("");

function submitNote() {
  if (!noteText.value.trim()) return;
  emit("add-note", {
    note: noteText.value.trim(),
    createdBy: createdBy.value.trim() || undefined,
  });
  noteText.value = "";
}
</script>

<template>
  <Card class="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Notes
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div v-if="!notes?.length" class="text-sm text-slate-500 dark:text-slate-400">
        No notes yet.
      </div>
      <ul v-else class="space-y-3">
        <li
          v-for="entry in notes"
          :key="entry.id"
          class="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3"
        >
          <p class="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{{ entry.note }}</p>
          <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span v-if="entry.createdBy">{{ entry.createdBy }} · </span>
            {{ formatDate(entry.createdAt) }}
          </p>
        </li>
      </ul>

      <div class="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
        <textarea
          v-model="noteText"
          rows="3"
          placeholder="Add a note…"
          class="flex w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm dark:bg-slate-950 resize-y min-h-[80px]"
        />
        <Input v-model="createdBy" placeholder="Created by (optional)…" />
        <Button type="button" size="sm" :disabled="loading || !noteText.trim()" @click="submitNote">
          Add Note
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
