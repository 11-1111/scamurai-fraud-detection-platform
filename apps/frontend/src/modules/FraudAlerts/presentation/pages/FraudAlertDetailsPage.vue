<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft } from "lucide-vue-next";
import { useFraudAlertDetails } from "../composables/useFraudAlertDetails";
import FraudAlertSummaryCard from "../components/FraudAlertSummaryCard.vue";
import FraudAlertActionsPanel from "../components/FraudAlertActionsPanel.vue";
import FraudAlertHistoryTimeline from "../components/FraudAlertHistoryTimeline.vue";
import FraudAlertFeaturesPanel from "../components/FraudAlertFeaturesPanel.vue";
import FraudAlertRulesPanel from "../components/FraudAlertRulesPanel.vue";
import FraudAlertPolicyPanel from "../components/FraudAlertPolicyPanel.vue";
import FraudAlertNetworkPanel from "../components/FraudAlertNetworkPanel.vue";
import FraudAlertNotesPanel from "../components/FraudAlertNotesPanel.vue";
import FraudAlertTransactionCard from "../components/FraudAlertTransactionCard.vue";
import FraudAlertEvaluationsPanel from "../components/FraudAlertEvaluationsPanel.vue";
import { Button } from "@/components/ui/button";
import { formatDate } from "../components/alertBadgeStyles";

const route = useRoute();
const router = useRouter();

const {
  alert,
  evaluations,
  selectedEvaluation,
  loading,
  error,
  actionLoading,
  loadAlert,
  selectEvaluation,
  assignAlert,
  updateStatus,
  resolveAlert,
  addNote,
  refresh,
} = useFraudAlertDetails();

const alertId = () => String(route.params.id ?? "");

const activeFeatures = computed(
  () => selectedEvaluation.value?.features ?? alert.value?.features ?? []
);
const activeRules = computed(
  () => selectedEvaluation.value?.triggeredRules ?? alert.value?.triggeredRules ?? []
);
const activePolicies = computed(
  () => selectedEvaluation.value?.policyActions ?? alert.value?.policyActions ?? []
);
const activeGraph = computed(
  () => selectedEvaluation.value?.graph ?? alert.value?.graph
);

function goBack() {
  router.push({ name: "FraudAlerts" });
}

async function onAssign(payload: { assignedTo: string; comment?: string; performedBy?: string }) {
  await assignAlert(alertId(), payload);
}

async function onStatusChange(payload: { status: string; comment?: string; performedBy?: string }) {
  await updateStatus(alertId(), payload);
}

async function onResolve(payload: { resolution: string; note?: string; resolvedBy?: string }) {
  await resolveAlert(alertId(), payload.resolution, payload.note, payload.resolvedBy);
}

async function onAddNote(payload: { note: string; createdBy?: string }) {
  await addNote(alertId(), payload.note, payload.createdBy);
}

onMounted(() => {
  if (alertId()) loadAlert(alertId());
});

watch(
  () => route.params.id,
  (id) => {
    if (id) loadAlert(String(id));
  }
);
</script>

<template>
  <div class="min-h-screen w-full flex-1 min-w-0">
    <div class="w-full px-4 sm:px-6 lg:px-8">
      <div class="space-y-6 min-w-0 py-2">
        <div class="px-2 sm:px-4 flex items-center gap-3">
          <Button type="button" size="sm" variant="outline" class="gap-1.5" @click="goBack">
            <ArrowLeft class="h-4 w-4" />
            Back to Fraud Alerts
          </Button>
        </div>

        <div v-if="loading && !alert" class="px-2 sm:px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400 animate-pulse">
          Loading alert details…
        </div>

        <div
          v-else-if="error && !alert"
          class="mx-2 sm:mx-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 px-4 py-3 text-sm text-red-800 dark:text-red-200"
          role="alert"
        >
          <p class="font-medium">{{ error.message.includes("404") ? "Alert not found" : "Failed to load alert" }}</p>
          <p class="mt-1 text-red-600 dark:text-red-300">{{ error.message }}</p>
          <Button type="button" size="sm" variant="outline" class="mt-3" @click="refresh">
            Retry
          </Button>
        </div>

        <template v-else-if="alert">
          <div
            v-if="error"
            class="mx-2 sm:mx-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
            role="alert"
          >
            <p class="font-medium">Action failed</p>
            <p class="mt-1">{{ error.message }}</p>
          </div>

          <div class="px-2 sm:px-4 space-y-6">
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div class="xl:col-span-2 space-y-6">
                <FraudAlertSummaryCard :alert="alert" />
                <FraudAlertTransactionCard
                  :transaction="alert.transaction"
                  :fallback="{
                    merchantName: alert.merchantName,
                    customerName: alert.customerName,
                    customerEmail: alert.customerEmail,
                    paymentAccount: alert.paymentAccount,
                  }"
                />
              </div>
              <div>
                <FraudAlertActionsPanel
                  :alert="alert"
                  :loading="actionLoading"
                  @assign="onAssign"
                  @status-change="onStatusChange"
                  @resolve="onResolve"
                />
              </div>
            </div>

            <FraudAlertEvaluationsPanel
              :evaluations="evaluations"
              :selected-id="selectedEvaluation?.id"
              :loading="actionLoading"
              @select="selectEvaluation"
            />

            <p
              v-if="selectedEvaluation"
              class="text-xs text-slate-500 dark:text-slate-400"
            >
              Viewing evaluation
              <span class="font-mono">{{ selectedEvaluation.id }}</span>
              <span v-if="selectedEvaluation.evaluationVersion != null">
                · v{{ selectedEvaluation.evaluationVersion }}
              </span>
              <span v-if="selectedEvaluation.completedAt">
                · completed {{ formatDate(selectedEvaluation.completedAt) }}
              </span>
            </p>

            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div class="xl:col-span-2 space-y-6">
                <FraudAlertRulesPanel :rules="activeRules" />
                <FraudAlertFeaturesPanel :features="activeFeatures" />
                <FraudAlertPolicyPanel :policies="activePolicies" />
                <FraudAlertNetworkPanel :graph="activeGraph" />
              </div>
              <div class="space-y-6">
                <FraudAlertNotesPanel
                  :notes="alert.notes"
                  :loading="actionLoading"
                  @add-note="onAddNote"
                />
                <FraudAlertHistoryTimeline :history="alert.history ?? []" />
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
