<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

defineProps<{
  reasons?: string[];
}>();
</script>

<template>
  <Card class="w-full border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-sm">
    <CardHeader class="pb-3">
      <div class="flex items-center gap-2">
        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20">
          <svg class="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        </div>
        <CardTitle class="text-sm font-semibold text-[#414141] dark:text-[#F9FBFC]">
          Risk Reasons
        </CardTitle>
        <span
          v-if="reasons?.length"
          class="ml-auto text-[10px] font-bold tabular-nums px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
        >
          {{ reasons.length }}
        </span>
      </div>
    </CardHeader>

    <CardContent>
      <p v-if="!reasons?.length" class="text-sm text-slate-500 dark:text-slate-400 py-3">
        No risk reasons available.
      </p>

      <ul v-else class="space-y-2">
        <li
          v-for="(reason, i) in reasons"
          :key="`reason-${i}`"
          class="flex items-start gap-2.5 p-2.5 rounded-md bg-purple-50/60 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30"
        >
          <span class="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 bg-purple-400 dark:bg-purple-500"></span>
          <span class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{{ reason }}</span>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
