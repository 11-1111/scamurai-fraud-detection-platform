<script setup lang="ts">
import type { FraudProfile } from "../../../domain/entities/Transaction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

defineProps<{
  fraudProfile: FraudProfile | null;
}>();

function riskLevelStyle(level: string): { badge: string; bar: string; score: string } {
  switch (level?.toUpperCase()) {
    case "LOW":
      return {
        badge: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
        bar: "bg-green-500",
        score: "text-green-600 dark:text-green-400",
      };
    case "MEDIUM":
      return {
        badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
        bar: "bg-amber-400",
        score: "text-amber-600 dark:text-amber-400",
      };
    case "HIGH":
      return {
        badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
        bar: "bg-orange-500",
        score: "text-orange-600 dark:text-orange-400",
      };
    case "CRITICAL":
      return {
        badge: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
        bar: "bg-red-600",
        score: "text-red-600 dark:text-red-400",
      };
    default:
      return {
        badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
        bar: "bg-slate-400",
        score: "text-slate-600 dark:text-slate-400",
      };
  }
}

function decisionBadge(decision: string): string {
  switch (decision?.toUpperCase()) {
    case "ALLOW":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    case "ALLOW_WITH_MONITORING":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "MANUAL_REVIEW":
    case "REVIEW":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
    case "BLOCK":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
}

function decisionLabel(decision: string): string {
  switch (decision?.toUpperCase()) {
    case "ALLOW_WITH_MONITORING": return "ALLOW W/ MONITORING";
    case "MANUAL_REVIEW": return "MANUAL REVIEW";
    default: return decision?.toUpperCase() ?? "—";
  }
}
</script>

<template>
  <Card
    class="w-full border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-sm"
  >
    <CardHeader class="pb-3">
      <div class="flex items-center gap-2">
        <div
          class="flex items-center justify-center w-8 h-8 rounded-lg bg-[#16659E]/10 dark:bg-[#16659E]/20"
        >
          <svg
            class="w-4 h-4 text-[#16659E]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
        </div>
        <CardTitle class="text-sm font-semibold text-[#414141] dark:text-[#F9FBFC]">
          Global Fraud Profile
        </CardTitle>
        <span
          v-if="fraudProfile"
          class="ml-auto text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded bg-[#16659E]/10 text-[#16659E] dark:bg-[#16659E]/20 dark:text-[#16659E]/80 uppercase"
        >
          {{ fraudProfile.scope }}
        </span>
      </div>
    </CardHeader>

    <CardContent>
      <!-- Null state -->
      <div v-if="!fraudProfile" class="flex flex-col gap-2 py-4">
        <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          No global fraud profile available. Search by email, phone, IP address, payment account,
          fingerprint, confirmation code, order tracking ID, or bank auth code.
        </p>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Global Fraud Profile is calculated from the fraud microservice using the full ingested
          transaction dataset.
        </p>
      </div>

      <!-- Populated state -->
      <div v-else class="space-y-4">
        <!-- Root identifier -->
        <div
          class="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50"
        >
          <span
            class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#16659E]/10 text-[#16659E] dark:bg-[#16659E]/20 dark:text-[#16659E]/80"
          >
            {{ fraudProfile.rootIdentifier.type }}
          </span>
          <span class="font-mono text-sm font-semibold text-[#414141] dark:text-[#F9FBFC] break-all">
            {{ fraudProfile.rootIdentifier.value }}
          </span>
        </div>

        <!-- Score + Risk Level row -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <!-- Risk Score -->
          <div
            class="col-span-2 sm:col-span-1 flex flex-col gap-1.5 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/50"
          >
            <span
              class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide"
              >Risk Score</span
            >
            <div class="flex items-end gap-1">
              <span
                class="text-3xl font-black tabular-nums"
                :class="riskLevelStyle(fraudProfile.riskLevel).score"
              >
                {{ fraudProfile.riskScore }}
              </span>
              <span class="text-xs text-slate-400 dark:text-slate-500 mb-1">/ 100</span>
            </div>
            <div class="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                :class="['h-full rounded-full transition-all', riskLevelStyle(fraudProfile.riskLevel).bar]"
                :style="{ width: `${Math.min(fraudProfile.riskScore, 100)}%` }"
              />
            </div>
          </div>

          <!-- Risk Level -->
          <div
            class="flex flex-col gap-1.5 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/50"
          >
            <span
              class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide"
              >Risk Level</span
            >
            <span
              :class="[
                'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase self-start mt-0.5',
                riskLevelStyle(fraudProfile.riskLevel).badge,
              ]"
            >
              {{ fraudProfile.riskLevel }}
            </span>
          </div>

          <!-- Default Decision -->
          <div
            v-if="fraudProfile.defaultDecision"
            class="flex flex-col gap-1.5 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/50"
          >
            <span
              class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide"
              >Default Decision</span
            >
            <span
              :class="[
                'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide self-start mt-0.5',
                decisionBadge(fraudProfile.defaultDecision),
              ]"
            >
              {{ decisionLabel(fraudProfile.defaultDecision) }}
            </span>
          </div>

          <!-- Final Decision — visually stronger -->
          <div
            class="flex flex-col gap-1.5 p-3 rounded-lg border-2 border-slate-300 dark:border-slate-600"
            :class="fraudProfile.defaultDecision ? '' : 'sm:col-span-2'"
          >
            <span
              class="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
              >Final Decision</span
            >
            <span
              :class="[
                'inline-flex items-center px-3 py-1.5 rounded-md text-xs font-black tracking-wide self-start mt-0.5 shadow-sm',
                decisionBadge(fraudProfile.decision),
              ]"
            >
              {{ decisionLabel(fraudProfile.decision) }}
            </span>
            <!-- Policy override indicator -->
            <span
              v-if="
                fraudProfile.defaultDecision &&
                fraudProfile.decision !== fraudProfile.defaultDecision
              "
              class="text-[10px] text-orange-600 dark:text-orange-400 font-semibold mt-0.5"
            >
              ↑ Policy override applied
            </span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
