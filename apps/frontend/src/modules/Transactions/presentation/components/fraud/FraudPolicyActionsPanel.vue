<script setup lang="ts">
import type { PolicyAction } from "../../../domain/entities/Transaction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computed } from "vue";

const props = defineProps<{
  policyActions?: PolicyAction[];
  defaultDecision?: string;
  decision: string;
}>();

const hasOverride = computed(
  () =>
    props.defaultDecision != null &&
    props.decision != null &&
    props.decision !== props.defaultDecision
);

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

function decisionLabel(d: string): string {
  switch (d?.toUpperCase()) {
    case "ALLOW_WITH_MONITORING": return "ALLOW W/ MONITORING";
    case "MANUAL_REVIEW": return "MANUAL REVIEW";
    default: return d?.toUpperCase() ?? "—";
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
          class="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20"
        >
          <svg
            class="w-4 h-4 text-indigo-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
            />
          </svg>
        </div>
        <CardTitle class="text-sm font-semibold text-[#414141] dark:text-[#F9FBFC]">
          Policy Actions
        </CardTitle>
        <span
          v-if="policyActions?.length"
          class="ml-auto text-[10px] font-bold tabular-nums px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
        >
          {{ policyActions.length }}
        </span>
      </div>
      <p class="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
        Policy actions determine the final business decision after risk scoring.
      </p>
    </CardHeader>

    <CardContent class="space-y-4">
      <!-- Decision flow -->
      <div
        v-if="defaultDecision || decision"
        class="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50"
      >
        <template v-if="defaultDecision">
          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Default</span>
            <span
              :class="[
                'px-2 py-0.5 rounded text-xs font-semibold',
                decisionBadge(defaultDecision),
              ]"
            >
              {{ decisionLabel(defaultDecision) }}
            </span>
          </div>
          <svg
            class="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </template>

        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Final Decision</span>
          <span
            :class="[
              'px-2.5 py-1 rounded-md text-xs font-black shadow-sm',
              decisionBadge(decision),
            ]"
          >
            {{ decisionLabel(decision) }}
          </span>
        </div>

        <span
          v-if="hasOverride"
          class="ml-auto text-[10px] font-semibold text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/30"
        >
          Policy override applied
        </span>
      </div>

      <!-- No actions -->
      <p
        v-if="!policyActions?.length"
        class="text-sm text-slate-500 dark:text-slate-400"
      >
        No policy override applied. Final decision follows the risk level default.
      </p>

      <!-- Policy action cards -->
      <ul v-else class="space-y-2">
        <li
          v-for="(action, i) in policyActions"
          :key="`policy-${i}`"
          class="rounded-md border border-indigo-100 dark:border-indigo-800/30 bg-indigo-50/50 dark:bg-indigo-900/10 p-3"
        >
          <div class="flex items-start justify-between gap-2 mb-1">
            <span class="text-sm font-semibold text-[#414141] dark:text-[#F9FBFC] leading-snug">
              {{ action.policyName }}
            </span>
            <span
              :class="[
                'shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                decisionBadge(action.decision),
              ]"
            >
              {{ decisionLabel(action.decision) }}
            </span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
            {{ action.actionLabel }}
          </p>
          <div class="flex items-center gap-3">
            <span class="text-[10px] font-mono text-slate-400 dark:text-slate-500">
              {{ action.policyCode }}
            </span>
            <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              Priority: <span class="text-indigo-600 dark:text-indigo-400 font-bold">{{ action.priority }}</span>
            </span>
          </div>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
