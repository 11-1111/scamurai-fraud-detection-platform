<script setup lang="ts">
import type { FraudProfile } from "../../../domain/entities/Transaction";
import FraudRiskSummaryCard from "./FraudRiskSummaryCard.vue";
import FraudFeatureSummaryPanel from "./FraudFeatureSummaryPanel.vue";
import FraudPolicyActionsPanel from "./FraudPolicyActionsPanel.vue";
import FraudTriggeredRulesPanel from "./FraudTriggeredRulesPanel.vue";
import FraudReasonsPanel from "./FraudReasonsPanel.vue";
import FraudNetworkPanel from "./FraudNetworkPanel.vue";

defineProps<{
  fraudProfile: FraudProfile | null;
}>();
</script>

<template>
  <div class="space-y-4">
    <!-- Section divider -->
    <div class="flex items-center gap-3">
      <div class="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      <span
        class="text-[11px] font-semibold tracking-widest text-slate-400 dark:text-slate-500 uppercase px-2"
      >
        Global Fraud Profile
      </span>
      <div class="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
    </div>

    <!-- Helper copy -->
    <p class="text-xs text-slate-400 dark:text-slate-500 leading-relaxed px-1">
      Global Fraud Profile is calculated from the fraud microservice using the full ingested
      transaction dataset.
    </p>

    <!-- 1. Risk summary — full width -->
    <FraudRiskSummaryCard :fraud-profile="fraudProfile" />

    <!-- Show remaining panels only when fraudProfile is present -->
    <template v-if="fraudProfile">
      <!-- 2. Feature summary + Policy actions — two columns on md+ -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FraudFeatureSummaryPanel :features="fraudProfile.features" />
        <FraudPolicyActionsPanel
          :policy-actions="fraudProfile.policyActions"
          :default-decision="fraudProfile.defaultDecision"
          :decision="fraudProfile.decision"
        />
      </div>

      <!-- 3. Triggered rules -->
      <FraudTriggeredRulesPanel :rules="fraudProfile.triggeredRules" />

      <!-- 4. Risk Reasons — full width -->
      <FraudReasonsPanel :reasons="fraudProfile.reasons" />

      <!-- 5. Fraud Network — full width -->
      <FraudNetworkPanel :graph="fraudProfile.graph" />
    </template>
  </div>
</template>
