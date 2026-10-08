<script setup lang="ts">
import { ref } from "vue";
import { Plus } from "lucide-vue-next";
import { useFraudConfig } from "../composables/useFraudConfig";
import FraudRulesTable from "../components/FraudRulesTable.vue";
import FraudRuleFormDialog from "../components/FraudRuleFormDialog.vue";
import RiskLevelsTable from "../components/RiskLevelsTable.vue";
import PolicyRulesTable from "../components/PolicyRulesTable.vue";
import FraudFeaturesTable from "../components/FraudFeaturesTable.vue";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  CreateFraudRulePayload,
  FraudRule,
  FraudRuleConfig,
  UpdateFraudRulePayload,
} from "../../domain/entities/FraudConfig";
import { toFraudRuleConfig } from "../../domain/entities/FraudConfig";
import { toast } from "@/components/ui/toast";

const {
  rules,
  riskLevels,
  policies,
  features,
  isLoading,
  actionLoading,
  error,
  load,
  createFraudRule,
  updateFraudRule,
  enableFraudRule,
  disableFraudRule,
} = useFraudConfig();

type Tab = "features" | "rules" | "risk-levels" | "policies";
const activeTab = ref<Tab>("features");

const tabs: { value: Tab; label: string; count: () => number }[] = [
  { value: "features", label: "Features", count: () => features.value.length },
  { value: "rules", label: "Fraud Rules", count: () => rules.value.length },
  { value: "risk-levels", label: "Risk Levels", count: () => riskLevels.value.length },
  { value: "policies", label: "Policies", count: () => policies.value.length },
];

const dialogOpen = ref(false);
const dialogMode = ref<"create" | "edit">("create");
const editingRule = ref<FraudRuleConfig | null>(null);
const submitError = ref<string | null>(null);

function openCreateDialog() {
  dialogMode.value = "create";
  editingRule.value = null;
  submitError.value = null;
  dialogOpen.value = true;
}

function openEditDialog(rule: FraudRule) {
  dialogMode.value = "edit";
  editingRule.value = toFraudRuleConfig(rule);
  submitError.value = null;
  dialogOpen.value = true;
}

function closeDialog() {
  dialogOpen.value = false;
  submitError.value = null;
}

async function onSubmit(payload: CreateFraudRulePayload | UpdateFraudRulePayload) {
  submitError.value = null;
  try {
    if (dialogMode.value === "create") {
      await createFraudRule(payload as CreateFraudRulePayload);
    } else if (editingRule.value) {
      await updateFraudRule(editingRule.value.id, payload as UpdateFraudRulePayload);
    }
    closeDialog();
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : String(e);
  }
}

async function onEnable(rule: FraudRule) {
  try {
    await enableFraudRule(rule.id);
  } catch (e) {
    toast({
      title: "Failed to enable rule",
      description: e instanceof Error ? e.message : String(e),
      variant: "destructive",
    });
  }
}

async function onDisable(rule: FraudRule) {
  try {
    await disableFraudRule(rule.id);
  } catch (e) {
    toast({
      title: "Failed to disable rule",
      description: e instanceof Error ? e.message : String(e),
      variant: "destructive",
    });
  }
}
</script>

<template>
<div class="min-h-screen w-full flex-1 min-w-0">
  <div class="w-full sm:px-2 lg:px-4">
    <div class="space-y-6 min-w-0">
        <div
          v-if="error"
          class="mx-6 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 px-4 py-3 text-sm text-red-800 dark:text-red-200"
        >
          <p class="font-medium">Failed to load fraud configuration</p>
          <p class="mt-1 text-red-600 dark:text-red-300">{{ error.message }}</p>
          <button
            type="button"
            class="mt-3 rounded-md bg-red-100 dark:bg-red-900/50 px-3 py-1.5 text-sm font-medium text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900"
            @click="load"
          >
            Retry
          </button>
        </div>

        <div
          role="tablist"
          class="flex gap-8 border-b border-[#E5E9EB] dark:border-slate-700 px-6"
        >
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.value"
            :class="cn(
              'py-4 text-sm font-medium transition-colors focus-visible:outline-none flex items-center gap-2',
              activeTab === tab.value
                ? 'border-b-2 border-[#16659E] text-[#16659E] font-bold'
                : 'border-b-2 border-transparent text-[#647887] dark:text-slate-400 hover:text-[#16659E]'
            )"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
            <span
              v-if="!isLoading && tab.count() > 0"
              :class="cn(
                'text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full',
                activeTab === tab.value
                  ? 'bg-[#16659E] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              )"
            >
              {{ tab.count() }}
            </span>
          </button>
        </div>

        <div class="w-full min-w-0">
          <div v-show="activeTab === 'features'" class="w-full min-w-0 px-6">
            <FraudFeaturesTable :features="features" :is-loading="isLoading" />
          </div>

          <div v-show="activeTab === 'rules'" class="w-full min-w-0 space-y-4 px-6">
            <div class="flex justify-end">
              <Button type="button" size="sm" class="gap-1.5" @click="openCreateDialog">
                <Plus class="h-4 w-4" />
                Create Rule
              </Button>
            </div>
            <FraudRulesTable
              :rules="rules"
              :is-loading="isLoading"
              :action-loading="actionLoading"
              @edit="openEditDialog"
              @enable="onEnable"
              @disable="onDisable"
            />
          </div>

          <div v-show="activeTab === 'risk-levels'" class="w-full min-w-0 px-6">
            <RiskLevelsTable :risk-levels="riskLevels" :is-loading="isLoading" />
          </div>

          <div v-show="activeTab === 'policies'" class="w-full min-w-0 px-6">
            <PolicyRulesTable :policies="policies" :is-loading="isLoading" />
          </div>
        </div>
    </div>
  </div>

  <FraudRuleFormDialog
    :open="dialogOpen"
    :mode="dialogMode"
    :rule="editingRule"
    :features="features"
    :submitting="actionLoading"
    :submit-error="submitError"
    @close="closeDialog"
    @submit="onSubmit"
  />
</div>
</template>
