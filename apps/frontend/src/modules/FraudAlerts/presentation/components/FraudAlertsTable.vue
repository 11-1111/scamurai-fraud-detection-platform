<script setup lang="ts">
import { useRouter } from "vue-router";
import type { FraudAlertSummary } from "../../domain/entities/FraudAlert";
import FraudAlertRiskBadge from "./FraudAlertRiskBadge.vue";
import FraudAlertStatusBadge from "./FraudAlertStatusBadge.vue";
import FraudAlertDecisionBadge from "./FraudAlertDecisionBadge.vue";
import { formatDate, formatLabel } from "./alertBadgeStyles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Copy, Check } from "lucide-vue-next";
import { ref } from "vue";
import { toast } from "@/components/ui/toast";

defineProps<{
  alerts: FraudAlertSummary[];
  loading?: boolean;
}>();

const router = useRouter();
const copiedId = ref<string | null>(null);

function viewAlert(id: string) {
  router.push({ name: "FraudAlertDetails", params: { id } });
}

function shortId(id: string): string {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function rootLabel(alert: FraudAlertSummary): string {
  const type = alert.rootIdentifierType || alert.rootIdentifier?.type || "";
  const value = alert.rootIdentifierValue || alert.rootIdentifier?.value || "";
  if (!type && !value) return "—";
  return `${type}: ${value}`;
}

async function copyId(id: string, event: Event) {
  event.stopPropagation();
  try {
    await navigator.clipboard.writeText(id);
    copiedId.value = id;
    toast({ title: "Copied", description: "Alert ID copied to clipboard." });
    setTimeout(() => {
      if (copiedId.value === id) copiedId.value = null;
    }, 1500);
  } catch {
    toast({ title: "Copy failed", description: "Could not copy alert ID.", variant: "destructive" });
  }
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
    <div v-if="loading" class="p-8 text-center text-sm text-slate-500 dark:text-slate-400 animate-pulse">
      Loading alerts…
    </div>

    <div v-else-if="alerts.length === 0" class="p-12 text-center">
      <p class="text-sm font-medium text-slate-700 dark:text-slate-300">No fraud alerts found</p>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Try adjusting your filters or check back later.
      </p>
    </div>

    <div v-else class="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow class="bg-slate-50/80 dark:bg-slate-800/50">
            <TableHead class="whitespace-nowrap">Created</TableHead>
            <TableHead class="whitespace-nowrap">Alert ID</TableHead>
            <TableHead class="whitespace-nowrap">Merchant</TableHead>
            <TableHead class="whitespace-nowrap">Customer</TableHead>
            <TableHead class="whitespace-nowrap">Root Identifier</TableHead>
            <TableHead class="whitespace-nowrap text-right">Score</TableHead>
            <TableHead class="whitespace-nowrap">Risk</TableHead>
            <TableHead class="whitespace-nowrap">Severity</TableHead>
            <TableHead class="whitespace-nowrap">Decision</TableHead>
            <TableHead class="whitespace-nowrap">Status</TableHead>
            <TableHead class="whitespace-nowrap">Assigned</TableHead>
            <TableHead class="whitespace-nowrap text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="alert in alerts"
            :key="alert.id"
            class="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
            tabindex="0"
            role="link"
            :aria-label="`View fraud alert ${alert.id}`"
            @click="viewAlert(alert.id)"
            @keydown.enter="viewAlert(alert.id)"
          >
            <TableCell class="whitespace-nowrap text-xs tabular-nums">
              {{ formatDate(alert.createdAt) }}
            </TableCell>
            <TableCell class="whitespace-nowrap">
              <div class="flex items-center gap-1">
                <span class="font-mono text-xs" :title="alert.id">{{ shortId(alert.id) }}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  class="h-6 w-6 p-0"
                  :aria-label="`Copy alert ID ${alert.id}`"
                  @click="copyId(alert.id, $event)"
                >
                  <Check v-if="copiedId === alert.id" class="h-3 w-3 text-green-600" />
                  <Copy v-else class="h-3 w-3" />
                </Button>
              </div>
            </TableCell>
            <TableCell class="text-xs max-w-[140px] truncate">
              {{ alert.merchantName || "—" }}
            </TableCell>
            <TableCell class="text-xs max-w-[160px]">
              <div class="truncate font-medium">{{ alert.customerName || "—" }}</div>
              <div class="truncate text-slate-500">{{ alert.customerEmail || "" }}</div>
            </TableCell>
            <TableCell class="max-w-[180px] truncate text-xs font-mono" :title="rootLabel(alert)">
              {{ rootLabel(alert) }}
            </TableCell>
            <TableCell class="text-right text-xs font-semibold tabular-nums">
              {{ alert.riskScore }}
            </TableCell>
            <TableCell>
              <FraudAlertRiskBadge :level="alert.riskLevel" />
            </TableCell>
            <TableCell class="text-xs">
              {{ (alert.severity || alert.highestSeverity) ? formatLabel(alert.severity || alert.highestSeverity || "") : "—" }}
            </TableCell>
            <TableCell>
              <FraudAlertDecisionBadge :decision="alert.decision || alert.finalDecision" />
            </TableCell>
            <TableCell>
              <FraudAlertStatusBadge :status="alert.status || alert.alertStatus" />
            </TableCell>
            <TableCell class="text-xs max-w-[120px] truncate">
              {{ alert.assignedTo || "—" }}
            </TableCell>
            <TableCell class="text-right">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                class="h-8 gap-1"
                aria-label="View alert details"
                @click.stop="viewAlert(alert.id)"
              >
                <Eye class="h-3.5 w-3.5" />
                View
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
