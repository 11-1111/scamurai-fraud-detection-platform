<script setup lang="ts">
import type { FraudAlertTransactionInfo } from "../../domain/entities/FraudAlert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

defineProps<{
  transaction?: FraudAlertTransactionInfo | null;
  fallback?: {
    merchantName?: string | null;
    customerName?: string | null;
    customerEmail?: string | null;
    paymentAccount?: string | null;
  };
}>();

function display(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  return String(value);
}
</script>

<template>
  <Card class="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Transaction / Customer
      </CardTitle>
    </CardHeader>
    <CardContent>
      <dl class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4 text-sm">
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Merchant</dt>
          <dd class="mt-1">{{ display(transaction?.merchantName ?? fallback?.merchantName) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Customer</dt>
          <dd class="mt-1">{{ display(transaction?.customerName ?? fallback?.customerName) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</dt>
          <dd class="mt-1 break-all">{{ display(transaction?.customerEmail ?? fallback?.customerEmail) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Phone</dt>
          <dd class="mt-1">{{ display(transaction?.phone) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">IP</dt>
          <dd class="mt-1 font-mono text-xs">{{ display(transaction?.ip) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Payment Account</dt>
          <dd class="mt-1 font-mono text-xs">{{ display(transaction?.paymentAccount ?? fallback?.paymentAccount) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Device Fingerprint</dt>
          <dd class="mt-1 font-mono text-xs break-all">{{ display(transaction?.deviceFingerprint) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Merchant Reference</dt>
          <dd class="mt-1">{{ display(transaction?.merchantRef) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Order Tracking ID</dt>
          <dd class="mt-1 font-mono text-xs">{{ display(transaction?.orderTrackingId) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Amount</dt>
          <dd class="mt-1 font-semibold">
            {{ display(transaction?.amount) }}
            <span v-if="transaction?.currency" class="text-xs font-normal text-slate-500 ml-1">{{ transaction.currency }}</span>
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Transaction Status</dt>
          <dd class="mt-1">{{ display(transaction?.transactionStatus) }}</dd>
        </div>
      </dl>
    </CardContent>
  </Card>
</template>
