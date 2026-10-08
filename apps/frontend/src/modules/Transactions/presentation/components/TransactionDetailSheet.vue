<script setup lang="ts">
import { computed } from "vue";
import type { Transaction } from "../../domain/entities/Transaction";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Copy, ExternalLink, X, User, Store } from "lucide-vue-next";
import FraudSummaryBadge from "./FraudSummaryBadge.vue";
import { formatDateTime } from "@/lib/formatDateTime";

const props = defineProps<{
  open: boolean;
  transaction: Transaction | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => emit("update:open", value),
});

function display(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  return value;
}

async function copyValue(value: string | null | undefined, label: string) {
  const text = display(value);
  if (text === "—") return;
  try {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  } catch {
    toast({ title: "Copy failed", description: `Could not copy ${label.toLowerCase()}.`, variant: "destructive" });
  }
}

function openExternal() {
  if (!props.transaction?.viewUrl) return;
  window.open(props.transaction.viewUrl, "_blank", "noopener,noreferrer");
}

const statusChipClass = computed(() => {
  const type = props.transaction?.statusType;
  switch (type) {
    case "success":
      return "txn-sheet__chip txn-sheet__chip--success";
    case "danger":
      return "txn-sheet__chip txn-sheet__chip--danger";
    case "warning":
      return "txn-sheet__chip txn-sheet__chip--warning";
    default:
      return "txn-sheet__chip txn-sheet__chip--info";
  }
});
</script>

<template>
  <Sheet v-model:open="openModel">
    <SheetContent side="right" class="txn-sheet w-full sm:max-w-md p-0 gap-0">
      <div class="txn-sheet__nav">
        <SheetTitle class="txn-sheet__title">Transaction details</SheetTitle>
        <button
          type="button"
          class="txn-sheet__icon-btn"
          aria-label="Close"
          @click="openModel = false"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div v-if="transaction" class="txn-sheet__body">
        <div class="txn-sheet__hero">
          <div class="txn-sheet__lbl">Amount</div>
          <div class="txn-sheet__amt mono-text">{{ transaction.amountFull || "—" }}</div>
          <div>
            <span :class="statusChipClass">
              <span class="txn-sheet__chip-dot" aria-hidden="true" />
              {{ transaction.statusText || "—" }}
            </span>
          </div>
          <div v-if="transaction.fraudSummary" class="mt-3">
            <FraudSummaryBadge :summary="transaction.fraudSummary" />
          </div>
          <div class="txn-sheet__ref mono-text">
            <span>{{ display(transaction.confirmationCode) }}</span>
            <button
              type="button"
              class="txn-sheet__copy-btn"
              aria-label="Copy confirmation code"
              @click="copyValue(transaction.confirmationCode, 'Confirmation code')"
            >
              <Copy class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div class="txn-sheet__journey">
          <div class="txn-sheet__j-item">
            <span class="txn-sheet__j-icon"><User class="h-4 w-4" /></span>
            <div class="txn-sheet__j-main">
              <div class="txn-sheet__j-eyebrow">Customer</div>
              <div class="txn-sheet__j-name">{{ display(transaction.customerName) }}</div>
              <div class="txn-sheet__j-sub">
                <span class="txn-sheet__j-k">Email</span>
                {{ display(transaction.customerEmail) }}
                ·
                <span class="txn-sheet__j-k">IP</span>
                <span class="mono-text">{{ display(transaction.customerIp) }}</span>
              </div>
            </div>
            <div class="txn-sheet__j-side">
              <div class="txn-sheet__j-d1">{{ formatDateTime(transaction.date) }}</div>
            </div>
          </div>

          <div class="txn-sheet__j-item">
            <span class="txn-sheet__j-icon"><Store class="h-4 w-4" /></span>
            <div class="txn-sheet__j-main">
              <div class="txn-sheet__j-eyebrow">Merchant</div>
              <div class="txn-sheet__j-name">{{ display(transaction.merchantName) }}</div>
              <div class="txn-sheet__j-sub">
                <span class="txn-sheet__j-k">Email</span>
                {{ display(transaction.merchantEmail) }}
              </div>
            </div>
            <div class="txn-sheet__j-side">
              <div class="txn-sheet__j-d1 mono-text truncate max-w-[100px]">{{ display(transaction.paymentAccount) }}</div>
              <div class="txn-sheet__j-d2">Payment account</div>
            </div>
          </div>
        </div>

        <div class="txn-sheet__sec">
          <div class="txn-sheet__sec-h">Reference & identifiers</div>
          <div class="txn-sheet__kv">
            <span class="txn-sheet__k">Confirmation</span>
            <span class="txn-sheet__leader" />
            <span class="txn-sheet__v mono-text">{{ display(transaction.confirmationCode) }}</span>
          </div>
          <div class="txn-sheet__kv">
            <span class="txn-sheet__k">Merchant ref</span>
            <span class="txn-sheet__leader" />
            <span class="txn-sheet__v">{{ display(transaction.orderNumber || transaction.merchantRef) }}</span>
          </div>
          <div class="txn-sheet__kv">
            <span class="txn-sheet__k">Phone number</span>
            <span class="txn-sheet__leader" />
            <span class="txn-sheet__v mono-text">{{ display(transaction.phoneNumber) }}</span>
          </div>
          <div class="txn-sheet__kv">
            <span class="txn-sheet__k">Order tracking ID</span>
            <span class="txn-sheet__leader" />
            <span class="txn-sheet__v mono-text">{{ display(transaction.orderTrackingId) }}</span>
          </div>
          <div class="txn-sheet__kv">
            <span class="txn-sheet__k">Bank auth code</span>
            <span class="txn-sheet__leader" />
            <span class="txn-sheet__v mono-text">{{ display(transaction.bankAuthCode) }}</span>
          </div>
          <div class="txn-sheet__kv">
            <span class="txn-sheet__k">Device fingerprint</span>
            <span class="txn-sheet__leader" />
            <span class="txn-sheet__v mono-text break-all text-right">{{ display(transaction.deviceFingerprint) }}</span>
          </div>
        </div>
      </div>

      <div v-if="transaction" class="txn-sheet__foot">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="gap-1.5"
          @click="copyValue(transaction.confirmationCode, 'Confirmation code')"
        >
          <Copy class="h-3.5 w-3.5" />
          Copy confirmation
        </Button>
        <Button
          v-if="transaction.viewUrl"
          type="button"
          size="sm"
          class="gap-1.5 bg-[#16659e] text-white hover:bg-[#125580]"
          @click="openExternal"
        >
          <ExternalLink class="h-3.5 w-3.5" />
          Open transaction
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>

<style scoped>
.txn-sheet {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-left: 1px solid #e3e5e9;
}

:global(.dark) .txn-sheet {
  background: linear-gradient(180deg, #17171c, #101014);
  border-left-color: rgba(148, 163, 184, 0.1);
  color: #eaf2fc;
}

.txn-sheet__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e3e5e9;
  flex-shrink: 0;
}

:global(.dark) .txn-sheet__nav {
  border-bottom-color: rgba(148, 163, 184, 0.1);
}

.txn-sheet__title {
  font-size: 15px;
  font-weight: 800;
  color: #10131c;
  letter-spacing: -0.02em;
}

:global(.dark) .txn-sheet__title {
  color: #eaf2fc;
}

.txn-sheet__icon-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e3e5e9;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}

.txn-sheet__icon-btn:hover {
  background: #f3f4f6;
  border-color: #d3d7dd;
  color: #10131c;
}

:global(.dark) .txn-sheet__icon-btn {
  background: #101014;
  border-color: rgba(148, 163, 184, 0.14);
  color: #93a8c8;
}

:global(.dark) .txn-sheet__icon-btn:hover {
  background: rgba(148, 163, 184, 0.07);
  color: #eaf2fc;
}

.txn-sheet__body {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 16px;
}

.txn-sheet__hero {
  padding: 20px 20px 18px;
  border-bottom: 1px solid #e3e5e9;
}

:global(.dark) .txn-sheet__hero {
  border-bottom-color: rgba(148, 163, 184, 0.1);
}

.txn-sheet__lbl {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8497a8;
  margin-bottom: 6px;
}

.txn-sheet__amt {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  color: #10131c;
  margin-bottom: 10px;
}

:global(.dark) .txn-sheet__amt {
  color: #f4f9ff;
}

.txn-sheet__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid transparent;
}

.txn-sheet__chip--success {
  color: #059669;
  background: rgba(5, 150, 105, 0.08);
  border-color: rgba(5, 150, 105, 0.2);
}

.txn-sheet__chip--danger {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
  border-color: rgba(220, 38, 38, 0.2);
}

.txn-sheet__chip--warning {
  color: #d97706;
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(217, 119, 6, 0.2);
}

.txn-sheet__chip--info {
  color: #16659e;
  background: rgba(22, 101, 158, 0.08);
  border-color: rgba(22, 101, 158, 0.2);
}

.txn-sheet__chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.txn-sheet__ref {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  font-size: 13px;
  color: #64748b;
}

.txn-sheet__copy-btn {
  display: grid;
  place-items: center;
  padding: 2px;
  border: none;
  background: none;
  color: #94a3b8;
  cursor: pointer;
}

.txn-sheet__copy-btn:hover {
  color: #16659e;
}

.txn-sheet__journey {
  padding: 16px 20px;
  border-bottom: 1px solid #e3e5e9;
}

:global(.dark) .txn-sheet__journey {
  border-bottom-color: rgba(148, 163, 184, 0.1);
}

.txn-sheet__j-item {
  display: flex;
  gap: 12px;
  padding: 10px 0 14px;
  position: relative;
}

.txn-sheet__j-item:not(:last-child)::before {
  content: "";
  position: absolute;
  left: 15px;
  top: 42px;
  bottom: -4px;
  width: 1px;
  background: #e3e5e9;
}

:global(.dark) .txn-sheet__j-item:not(:last-child)::before {
  background: rgba(148, 163, 184, 0.1);
}

.txn-sheet__j-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: #f3f4f6;
  border: 1px solid rgba(22, 101, 158, 0.2);
  color: #16659e;
}

:global(.dark) .txn-sheet__j-icon {
  background: #101014;
  border-color: rgba(77, 166, 255, 0.5);
  color: #4da6ff;
}

.txn-sheet__j-main {
  flex: 1;
  min-width: 0;
}

.txn-sheet__j-eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #16659e;
  margin-bottom: 2px;
}

.txn-sheet__j-name {
  font-size: 14px;
  font-weight: 700;
  color: #10131c;
}

:global(.dark) .txn-sheet__j-name {
  color: #eaf2fc;
}

.txn-sheet__j-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}

.txn-sheet__j-k {
  color: #94a3b8;
  font-weight: 600;
}

.txn-sheet__j-side {
  text-align: right;
  flex-shrink: 0;
}

.txn-sheet__j-d1 {
  font-size: 12px;
  font-weight: 600;
  color: #10131c;
}

:global(.dark) .txn-sheet__j-d1 {
  color: #eaf2fc;
}

.txn-sheet__j-d2 {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 2px;
}

.txn-sheet__sec {
  padding: 16px 20px;
}

.txn-sheet__sec-h {
  font-size: 13px;
  font-weight: 800;
  color: #10131c;
  margin-bottom: 12px;
}

:global(.dark) .txn-sheet__sec-h {
  color: #eaf2fc;
}

.txn-sheet__kv {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: baseline;
  gap: 8px;
  padding: 7px 0;
  font-size: 13px;
}

.txn-sheet__k {
  color: #8497a8;
  white-space: nowrap;
}

.txn-sheet__leader {
  border-bottom: 1px dotted #e3e5e9;
  min-width: 12px;
}

:global(.dark) .txn-sheet__leader {
  border-bottom-color: rgba(148, 163, 184, 0.1);
}

.txn-sheet__v {
  color: #10131c;
  font-weight: 600;
  text-align: right;
  max-width: 55%;
  word-break: break-word;
}

:global(.dark) .txn-sheet__v {
  color: #eaf2fc;
}

.txn-sheet__foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid #e3e5e9;
  flex-shrink: 0;
}

:global(.dark) .txn-sheet__foot {
  border-top-color: rgba(148, 163, 184, 0.1);
}
</style>
