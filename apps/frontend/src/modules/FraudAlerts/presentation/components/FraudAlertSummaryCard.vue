<script setup lang="ts">
import type { FraudAlertSummary } from "../../domain/entities/FraudAlert";
import FraudAlertRiskBadge from "./FraudAlertRiskBadge.vue";
import FraudAlertStatusBadge from "./FraudAlertStatusBadge.vue";
import FraudAlertDecisionBadge from "./FraudAlertDecisionBadge.vue";
import { formatDate, formatLabel } from "./alertBadgeStyles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

defineProps<{ alert: FraudAlertSummary }>();
</script>

<template>
  <Card class="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Alert Summary
      </CardTitle>
    </CardHeader>
    <CardContent>
      <dl class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4 text-sm">
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Alert ID</dt>
          <dd class="mt-1 font-mono text-xs break-all">{{ alert.id }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Transaction ID</dt>
          <dd class="mt-1 font-mono text-xs break-all">{{ alert.fraudTransactionId || alert.transactionId || "—" }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Root Identifier</dt>
          <dd class="mt-1 font-mono text-xs break-all">
            {{ alert.rootIdentifierType || alert.rootIdentifier?.type }}: {{ alert.rootIdentifierValue || alert.rootIdentifier?.value }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Risk Score</dt>
          <dd class="mt-1 text-lg font-bold tabular-nums">{{ alert.riskScore }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Risk Level</dt>
          <dd class="mt-1"><FraudAlertRiskBadge :level="alert.riskLevel" /></dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Severity</dt>
          <dd class="mt-1">{{ (alert.severity || alert.highestSeverity) ? formatLabel(alert.severity || alert.highestSeverity || "") : "—" }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Final Decision</dt>
          <dd class="mt-1"><FraudAlertDecisionBadge :decision="alert.decision || alert.finalDecision" /></dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</dt>
          <dd class="mt-1"><FraudAlertStatusBadge :status="alert.status || alert.alertStatus" /></dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Resolution</dt>
          <dd class="mt-1">{{ alert.resolution ? formatLabel(alert.resolution) : "—" }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Assigned To</dt>
          <dd class="mt-1">{{ alert.assignedTo || "—" }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Created At</dt>
          <dd class="mt-1 tabular-nums">{{ formatDate(alert.createdAt) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Updated At</dt>
          <dd class="mt-1 tabular-nums">{{ formatDate(alert.updatedAt) }}</dd>
        </div>
      </dl>
    </CardContent>
  </Card>
</template>
