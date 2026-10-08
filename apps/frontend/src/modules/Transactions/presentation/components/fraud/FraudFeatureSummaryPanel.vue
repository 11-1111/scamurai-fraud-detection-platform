<script setup lang="ts">
import type { FraudFeatures } from "../../../domain/entities/Transaction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computed } from "vue";

const props = defineProps<{
  features?: FraudFeatures;
}>();

interface FeatureDef {
  key: string;
  label: string;
  format?: "amount" | "count";
}

const FEATURE_DEFS: FeatureDef[] = [
  { key: "transactionCount", label: "Transactions", format: "count" },
  { key: "failedTransactionCount", label: "Failed Transactions", format: "count" },
  { key: "successfulTransactionCount", label: "Successful Transactions", format: "count" },
  { key: "uniqueIpsLinked", label: "Unique IPs Linked", format: "count" },
  { key: "uniqueEmailsLinked", label: "Unique Emails Linked", format: "count" },
  { key: "uniqueEmailsPerPaymentAccount", label: "Emails per Payment Account", format: "count" },
  { key: "uniqueEmailsPerIp", label: "Emails per IP", format: "count" },
  { key: "paymentAccountCount", label: "Payment Accounts", format: "count" },
  { key: "fingerprintCount", label: "Device Fingerprints", format: "count" },
  { key: "merchantCount", label: "Merchants", format: "count" },
  { key: "confirmationCodeCount", label: "Confirmation Codes", format: "count" },
  { key: "orderTrackingIdCount", label: "Order Tracking IDs", format: "count" },
  { key: "bankAuthCodeCount", label: "Bank Auth Codes", format: "count" },
  { key: "totalAmountValue", label: "Total Amount", format: "amount" },
  { key: "averageAmountValue", label: "Average Amount", format: "amount" },
];

const activeFeatures = computed(() => {
  if (!props.features || Object.keys(props.features).length === 0) return [];
  return FEATURE_DEFS.filter((def) => props.features![def.key] != null);
});

const isEmpty = computed(() => activeFeatures.value.length === 0);

function formatValue(def: FeatureDef, raw: number): string {
  if (def.format === "amount") {
    return raw.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return String(raw);
}

function valueColor(def: FeatureDef, raw: number): string {
  if (def.key === "failedTransactionCount" && raw > 0)
    return "text-red-600 dark:text-red-400";
  if (def.key === "successfulTransactionCount")
    return "text-green-600 dark:text-green-400";
  return "text-[#414141] dark:text-[#F9FBFC]";
}
</script>

<template>
  <Card
    class="w-full border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-sm"
  >
    <CardHeader class="pb-3">
      <div class="flex items-center gap-2">
        <div
          class="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20"
        >
          <svg
            class="w-4 h-4 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            />
          </svg>
        </div>
        <CardTitle class="text-sm font-semibold text-[#414141] dark:text-[#F9FBFC]">
          Feature Summary
        </CardTitle>
        <span
          v-if="!isEmpty"
          class="ml-auto text-[10px] font-bold tabular-nums px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        >
          {{ activeFeatures.length }}
        </span>
      </div>
      <p class="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
        These are measurable facts calculated by the fraud microservice before rules are evaluated.
      </p>
    </CardHeader>

    <CardContent>
      <!-- Empty state -->
      <p v-if="isEmpty" class="text-sm text-slate-500 dark:text-slate-400 py-3">
        No feature values available.
      </p>

      <!-- Feature grid -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div
          v-for="def in activeFeatures"
          :key="def.key"
          class="flex flex-col gap-0.5 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30"
        >
          <span class="text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight">
            {{ def.label }}
          </span>
          <span
            class="text-lg font-black tabular-nums leading-none mt-0.5"
            :class="valueColor(def, features![def.key] ?? 0)"
          >
            {{ formatValue(def, features![def.key] ?? 0) }}
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
