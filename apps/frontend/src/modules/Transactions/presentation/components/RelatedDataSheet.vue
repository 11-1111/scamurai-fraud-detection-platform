<script setup lang="ts">
import { computed, ref } from "vue";
import type { FraudRelatedIdentifiers, PageCorrelations } from "../../domain/entities/Transaction";
import {
  CORRELATION_GROUP_KEYS,
  mergeCorrelationGroups,
  type CorrelationGroupKey,
} from "../../application/mappers/correlationMapper";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const SECTION_KEYS = CORRELATION_GROUP_KEYS;

const props = defineProps<{
  open?: boolean;
  /** Page-scoped correlations from the transactions list response */
  pageCorrelations?: PageCorrelations;
  /** Legacy prop — still accepted for backward compatibility */
  correlations?: PageCorrelations;
  /** Global related identifiers from fraudProfile.relatedIdentifiers */
  relatedIdentifiers?: FraudRelatedIdentifiers | null;
  currentPage: number;
  pageResultsCount: number;
}>();

defineEmits<{
  "update:open": [value: boolean];
}>();

const effectiveCorrelations = computed((): PageCorrelations =>
  mergeCorrelationGroups(
    props.pageCorrelations ?? props.correlations,
    props.relatedIdentifiers
  )
);

const sectionLabels: Record<CorrelationGroupKey, string> = {
  emails: "Emails",
  phones: "Phones",
  ips: "IP Addresses",
  paymentAccounts: "Payment Accounts",
  fingerprints: "Device Fingerprints",
  merchants: "Merchants",
  confirmationCodes: "Confirmation Codes",
  orderTrackingIds: "Order Tracking IDs",
  bankAuthCodes: "Bank Auth Codes",
};

const sectionIcons: Record<CorrelationGroupKey, string> = {
  emails: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  phones: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
  ips: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
  paymentAccounts: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  fingerprints: "M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4",
  merchants: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  confirmationCodes: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  orderTrackingIds: "M7 7h.01M7 3h5c.512 0 .953.198 1.387.48l3.613 2.48c.434.282.953.48 1.387.48H21a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h2",
  bankAuthCodes: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
};

const sectionColors: Record<CorrelationGroupKey, { bg: string; text: string; border: string; badge: string; dot: string }> = {
  emails: {
    bg: "bg-[#16659E]/5 dark:bg-[#16659E]/10",
    text: "text-[#16659E] dark:text-[#16659E]/80",
    border: "border-[#16659E]/15 dark:border-[#16659E]/20",
    badge: "bg-[#16659E]/10 text-[#16659E] dark:bg-[#16659E]/20 dark:text-[#16659E]/90",
    dot: "bg-[#16659E]",
  },
  phones: {
    bg: "bg-[#16659E]/8 dark:bg-[#16659E]/12",
    text: "text-[#16659E]/90 dark:text-[#16659E]/70",
    border: "border-[#16659E]/12 dark:border-[#16659E]/18",
    badge: "bg-[#16659E]/12 text-[#16659E]/90 dark:bg-[#16659E]/18 dark:text-[#16659E]/80",
    dot: "bg-[#16659E]/80",
  },
  ips: {
    bg: "bg-[#16659E]/4 dark:bg-[#16659E]/8",
    text: "text-[#16659E]/80 dark:text-[#16659E]/60",
    border: "border-[#16659E]/10 dark:border-[#16659E]/15",
    badge: "bg-[#16659E]/8 text-[#16659E]/80 dark:bg-[#16659E]/15 dark:text-[#16659E]/70",
    dot: "bg-[#16659E]/70",
  },
  paymentAccounts: {
    bg: "bg-[#830000]/5 dark:bg-[#830000]/10",
    text: "text-[#830000] dark:text-[#830000]/80",
    border: "border-[#830000]/15 dark:border-[#830000]/20",
    badge: "bg-[#830000]/10 text-[#830000] dark:bg-[#830000]/20 dark:text-[#830000]/90",
    dot: "bg-[#830000]",
  },
  fingerprints: {
    bg: "bg-[#830000]/8 dark:bg-[#830000]/12",
    text: "text-[#830000]/90 dark:text-[#830000]/70",
    border: "border-[#830000]/12 dark:border-[#830000]/18",
    badge: "bg-[#830000]/12 text-[#830000]/90 dark:bg-[#830000]/18 dark:text-[#830000]/80",
    dot: "bg-[#830000]/80",
  },
  merchants: {
    bg: "bg-[#16659E]/6 dark:bg-[#16659E]/11",
    text: "text-[#16659E]/85 dark:text-[#16659E]/65",
    border: "border-[#16659E]/12 dark:border-[#16659E]/18",
    badge: "bg-[#16659E]/10 text-[#16659E]/85 dark:bg-[#16659E]/18 dark:text-[#16659E]/75",
    dot: "bg-[#16659E]/75",
  },
  confirmationCodes: {
    bg: "bg-[#830000]/6 dark:bg-[#830000]/11",
    text: "text-[#830000]/85 dark:text-[#830000]/65",
    border: "border-[#830000]/12 dark:border-[#830000]/18",
    badge: "bg-[#830000]/10 text-[#830000]/85 dark:bg-[#830000]/18 dark:text-[#830000]/75",
    dot: "bg-[#830000]/75",
  },
  orderTrackingIds: {
    bg: "bg-[#16659E]/5 dark:bg-[#16659E]/9",
    text: "text-[#16659E]/75 dark:text-[#16659E]/55",
    border: "border-[#16659E]/10 dark:border-[#16659E]/15",
    badge: "bg-[#16659E]/8 text-[#16659E]/75 dark:bg-[#16659E]/15 dark:text-[#16659E]/65",
    dot: "bg-[#16659E]/65",
  },
  bankAuthCodes: {
    bg: "bg-[#830000]/5 dark:bg-[#830000]/9",
    text: "text-[#830000]/75 dark:text-[#830000]/55",
    border: "border-[#830000]/10 dark:border-[#830000]/15",
    badge: "bg-[#830000]/8 text-[#830000]/75 dark:bg-[#830000]/15 dark:text-[#830000]/65",
    dot: "bg-[#830000]/65",
  },
};

const getTotalCorrelations = (c: PageCorrelations) => {
  const sum = (arr: { count?: number }[] | undefined) =>
    (arr ?? []).reduce((acc, item) => acc + (item.count ?? 1), 0);
  return SECTION_KEYS.reduce((total, key) => total + sum(c[key]), 0);
};

const copiedId = ref<string | null>(null);
let copiedTimeout: ReturnType<typeof setTimeout> | null = null;

function setCopiedFeedback(id: string) {
  copiedId.value = id;
  if (copiedTimeout) clearTimeout(copiedTimeout);
  copiedTimeout = setTimeout(() => {
    copiedId.value = null;
  }, 1500);
}

async function copyToClipboard(text: string, id: string) {
  const str = String(text ?? "").trim();
  if (!str) return;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(str);
      setCopiedFeedback(id);
      return;
    } catch {
      // fall through
    }
  }
  const ta = document.createElement("textarea");
  ta.value = str;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, str.length);
  try {
    if (document.execCommand("copy")) setCopiedFeedback(id);
  } finally {
    document.body.removeChild(ta);
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="$emit('update:open', $event)">
    <SheetTrigger as-child>
      <slot name="trigger" />
    </SheetTrigger>
    <SheetContent
      side="right"
      class="flex flex-col w-full sm:max-w-lg overflow-hidden bg-[#F9FBFC] dark:bg-[#414141] border-l border-[#16659E]/10 dark:border-[#16659E]/20 p-0"
    >
      <!-- Header -->
      <SheetHeader
        class="px-6 pt-6 pb-4 border-b border-[#16659E]/10 dark:border-[#16659E]/20 bg-white dark:bg-[#414141]/80"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex items-center justify-center w-10 h-10 rounded-lg bg-[#D5EBFB] dark:bg-[#16659E]/20 border border-[#16659E]/20 dark:border-[#16659E]/30"
          >
            <svg
              class="w-5 h-5 text-[#16659E] dark:text-[#D5EBFB]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
              />
            </svg>
          </div>
          <div class="flex-1">
            <SheetTitle
              class="text-base font-semibold text-[#414141] dark:text-[#F9FBFC] tracking-tight"
            >
              Global Correlations
            </SheetTitle>
            <p class="text-xs text-[#414141]/60 dark:text-[#F9FBFC]/60 mt-0.5 font-medium">
              Global fraud intelligence for your search &bull; Page {{ currentPage }} &bull;
              {{ pageResultsCount }} matching transaction{{ pageResultsCount !== 1 ? "s" : "" }}
            </p>
          </div>
        </div>

        <!-- Notice -->
        <p
          class="text-xs text-[#414141]/60 dark:text-[#F9FBFC]/60 mt-3 pt-3 border-t border-[#16659E]/10 dark:border-[#16659E]/20 leading-relaxed"
        >
          These values come from global fraud intelligence across the full ingested transaction
          dataset, scoped to your current search filters.
        </p>

        <!-- Stats Bar -->
        <div class="flex items-center gap-2 mt-3">
          <div
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#D5EBFB] dark:bg-[#16659E]/20 border border-[#16659E]/20 dark:border-[#16659E]/30"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-[#16659E] animate-pulse"></span>
            <span class="text-xs font-medium text-[#0C4299] dark:text-[#D5EBFB]">
              {{ getTotalCorrelations(effectiveCorrelations) }} Total Links
            </span>
          </div>
        </div>
      </SheetHeader>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <section
          v-for="key in SECTION_KEYS"
          :key="key"
          v-show="(effectiveCorrelations[key]?.length ?? 0) > 0"
          :class="[
            'rounded-md border transition-all duration-200 overflow-hidden',
            sectionColors[key].border,
            sectionColors[key].bg,
          ]"
        >
          <!-- Section Header -->
          <div
            class="flex items-center justify-between px-4 py-3 border-b border-[#414141]/5 dark:border-white/5"
          >
            <div class="flex items-center gap-2.5">
              <div
                :class="['flex items-center justify-center w-8 h-8 rounded-lg', sectionColors[key].bg]"
              >
                <svg
                  :class="['w-4 h-4', sectionColors[key].text]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" :d="sectionIcons[key]" />
                </svg>
              </div>
              <h3 class="text-sm font-semibold text-[#414141] dark:text-[#F9FBFC]">
                {{ sectionLabels[key] }}
                <span class="px-2 py-0.5 text-xs font-semibold tabular-nums">
                  {{ effectiveCorrelations[key]?.length ?? 0 }}
                </span>
              </h3>
            </div>
          </div>

          <!-- Items List -->
          <ul class="divide-y divide-[#414141]/5 dark:divide-white/5">
            <li
              v-for="(item, i) in effectiveCorrelations[key] ?? []"
              :key="`${key}-${i}`"
              class="group flex items-center gap-3 px-4 py-2.5 hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
            >
              <span :class="['w-1.5 h-1.5 rounded-full shrink-0', sectionColors[key].dot]"></span>
              <span
                class="flex-1 text-sm text-[#414141] dark:text-[#F9FBFC]/80 break-all leading-relaxed"
              >{{ item.value }}</span>
              <span
                :class="[sectionColors[key].badge, 'px-2 py-0.5 rounded text-xs font-semibold tabular-nums shrink-0']"
                :title="`Count: ${item.count}`"
              >{{ item.count }}</span>
              <button
                type="button"
                :aria-label="`Copy ${item.value}`"
                class="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-[#D5EBFB] dark:hover:bg-[#16659E]/20 transition-all shrink-0"
                @click.stop.prevent="copyToClipboard(String(item.value), `${key}-${i}`)"
              >
                <svg
                  v-if="copiedId !== `${key}-${i}`"
                  class="w-3.5 h-3.5 text-[#16659E]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span v-else class="text-xs font-medium text-[#16659E]">Copied!</span>
              </button>
            </li>
          </ul>
        </section>

        <!-- Empty State -->
        <div
          v-if="!SECTION_KEYS.some((k) => (effectiveCorrelations[k]?.length ?? 0) > 0)"
          class="flex flex-col items-center justify-center py-16 px-4"
        >
          <div
            class="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#D5EBFB] dark:bg-[#16659E]/20 border border-[#16659E]/20 dark:border-[#16659E]/30 mb-4"
          >
            <svg
              class="w-8 h-8 text-[#16659E]/50 dark:text-[#D5EBFB]/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          </div>
          <p class="text-sm font-medium text-[#414141]/70 dark:text-[#F9FBFC]/70">
            No global correlations found.
          </p>
          <p class="text-xs text-[#414141]/50 dark:text-[#F9FBFC]/50 mt-1">
            No related identifiers detected for your current search
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="px-6 py-4 border-t border-[#16659E]/10 dark:border-[#16659E]/20 bg-white dark:bg-[#414141]/80"
      >
        <div
          class="flex items-center justify-between text-xs text-[#414141]/60 dark:text-[#F9FBFC]/60"
        >
          <span class="flex items-center gap-1.5">
            <svg
              class="w-3.5 h-3.5 text-[#16659E]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Global fraud intelligence
          </span>
          <span class="text-[#16659E]">v3.0</span>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
