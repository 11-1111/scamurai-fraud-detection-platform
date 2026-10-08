<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type {
  CreateFraudRulePayload,
  FraudFeatureConfig,
  FraudRuleConfig,
  UpdateFraudRulePayload,
} from "../../domain/entities/FraudConfig";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const props = defineProps<{
  open: boolean;
  mode: "create" | "edit";
  rule?: FraudRuleConfig | null;
  features: FraudFeatureConfig[];
  submitting?: boolean;
  submitError?: string | null;
}>();

const emit = defineEmits<{
  close: [];
  submit: [payload: CreateFraudRulePayload | UpdateFraudRulePayload];
}>();

const ruleCode = ref("");
const ruleName = ref("");
const description = ref("");
const featureName = ref("");
const operator = ref("");
const thresholdValue = ref<number | "">("");
const severity = ref("");
const scoreImpact = ref<number | "">("");
const isEnabled = ref(true);
const errors = ref<Record<string, string>>({});

const severityOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const selectedFeature = computed(() =>
  props.features.find((f) => f.featureName === featureName.value) ?? null
);

const featuresByCategory = computed(() => {
  const groups: Record<string, FraudFeatureConfig[]> = {};
  for (const feature of props.features) {
    const category = feature.category || "Other";
    if (!groups[category]) groups[category] = [];
    groups[category].push(feature);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
});

const operatorOptions = computed(() => {
  const feature = selectedFeature.value;
  if (!feature) return [];
  if (feature.dataType === "boolean") {
    const booleanOps = ["=", "!="];
    return feature.supportedOperators.filter((op) => booleanOps.includes(op));
  }
  return feature.supportedOperators;
});

const isEditMode = computed(() => props.mode === "edit");

function resetForm() {
  errors.value = {};
  if (props.mode === "edit" && props.rule) {
    ruleCode.value = props.rule.ruleCode;
    ruleName.value = props.rule.ruleName;
    description.value = props.rule.description ?? "";
    featureName.value = props.rule.featureName;
    operator.value = props.rule.operator;
    thresholdValue.value = props.rule.thresholdValue;
    severity.value = props.rule.severity;
    scoreImpact.value = props.rule.scoreImpact;
    isEnabled.value = props.rule.isEnabled;
  } else {
    ruleCode.value = "";
    ruleName.value = "";
    description.value = "";
    featureName.value = "";
    operator.value = "";
    thresholdValue.value = "";
    severity.value = "";
    scoreImpact.value = "";
    isEnabled.value = true;
  }
}

function onFeatureChange() {
  const feature = selectedFeature.value;
  if (!feature) {
    operator.value = "";
    return;
  }
  if (feature.dataType === "boolean") {
    thresholdValue.value = 1;
    const ops = operatorOptions.value;
    if (!ops.includes(operator.value)) {
      operator.value = ops[0] ?? "=";
    }
  } else if (!feature.supportedOperators.includes(operator.value)) {
    operator.value = feature.supportedOperators[0] ?? "";
  }
}

function validate(): boolean {
  const next: Record<string, string> = {};

  if (!isEditMode.value && !ruleCode.value.trim()) {
    next.ruleCode = "Rule code is required.";
  }
  if (!ruleName.value.trim()) {
    next.ruleName = "Rule name is required.";
  }
  if (!featureName.value) {
    next.featureName = "Feature is required.";
  }
  if (!operator.value) {
    next.operator = "Operator is required.";
  }
  if (thresholdValue.value === "" || Number.isNaN(Number(thresholdValue.value))) {
    next.thresholdValue = "Threshold value is required.";
  }
  if (!severity.value) {
    next.severity = "Severity is required.";
  }
  const score = Number(scoreImpact.value);
  if (scoreImpact.value === "" || Number.isNaN(score)) {
    next.scoreImpact = "Score impact is required.";
  } else if (score < 0 || score > 100) {
    next.scoreImpact = "Score impact must be between 0 and 100.";
  }

  errors.value = next;
  return Object.keys(next).length === 0;
}

function onSubmit() {
  if (!validate()) return;

  if (isEditMode.value) {
    const payload: UpdateFraudRulePayload = {
      ruleName: ruleName.value.trim(),
      description: description.value.trim() || undefined,
      featureName: featureName.value,
      operator: operator.value,
      thresholdValue: Number(thresholdValue.value),
      severity: severity.value,
      scoreImpact: Number(scoreImpact.value),
      isEnabled: isEnabled.value,
    };
    emit("submit", payload);
    return;
  }

  const payload: CreateFraudRulePayload = {
    ruleCode: ruleCode.value.trim(),
    ruleName: ruleName.value.trim(),
    description: description.value.trim() || undefined,
    featureName: featureName.value,
    operator: operator.value,
    thresholdValue: Number(thresholdValue.value),
    severity: severity.value,
    scoreImpact: Number(scoreImpact.value),
    isEnabled: isEnabled.value,
  };
  emit("submit", payload);
}

function onOpenChange(value: boolean) {
  if (!value) emit("close");
}

watch(
  () => [props.open, props.mode, props.rule] as const,
  ([open]) => {
    if (open) resetForm();
  }
);

watch(featureName, onFeatureChange);
</script>

<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent class="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ isEditMode ? "Edit Fraud Rule" : "Create Fraud Rule" }}</DialogTitle>
        <DialogDescription>
          {{ isEditMode ? "Update rule configuration and scoring." : "Define a new fraud detection rule based on an available feature." }}
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div v-if="submitError" class="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {{ submitError }}
        </div>

        <div class="space-y-1.5">
          <Label for="ruleCode">Rule Code</Label>
          <Input
            id="ruleCode"
            v-model="ruleCode"
            :disabled="isEditMode"
            placeholder="e.g. HIGH_VELOCITY_IP"
            class="font-mono"
          />
          <p v-if="errors.ruleCode" class="text-xs text-red-600 dark:text-red-400">{{ errors.ruleCode }}</p>
        </div>

        <div class="space-y-1.5">
          <Label for="ruleName">Rule Name</Label>
          <Input id="ruleName" v-model="ruleName" placeholder="Human-readable rule name" />
          <p v-if="errors.ruleName" class="text-xs text-red-600 dark:text-red-400">{{ errors.ruleName }}</p>
        </div>

        <div class="space-y-1.5">
          <Label for="description">Description</Label>
          <textarea
            id="description"
            v-model="description"
            rows="2"
            placeholder="Optional description…"
            class="flex w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm dark:bg-slate-950 resize-y min-h-[60px]"
          />
        </div>

        <div class="space-y-1.5">
          <Label for="featureName">Feature</Label>
          <select
            id="featureName"
            v-model="featureName"
            class="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm dark:bg-slate-950"
          >
            <option value="">Select a feature…</option>
            <optgroup v-for="[category, items] in featuresByCategory" :key="category" :label="category">
              <option v-for="feature in items" :key="feature.featureName" :value="feature.featureName">
                {{ feature.label }}
              </option>
            </optgroup>
          </select>
          <p v-if="errors.featureName" class="text-xs text-red-600 dark:text-red-400">{{ errors.featureName }}</p>
          <div
            v-if="selectedFeature"
            class="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 space-y-1"
          >
            <p><span class="font-semibold">Category:</span> {{ selectedFeature.category }}</p>
            <p v-if="selectedFeature.description">{{ selectedFeature.description }}</p>
            <p><span class="font-semibold">Type:</span> {{ selectedFeature.dataType }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <Label for="operator">Operator</Label>
            <select
              id="operator"
              v-model="operator"
              :disabled="!featureName"
              class="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm dark:bg-slate-950 disabled:opacity-50"
            >
              <option value="">Select…</option>
              <option v-for="op in operatorOptions" :key="op" :value="op">{{ op }}</option>
            </select>
            <p v-if="errors.operator" class="text-xs text-red-600 dark:text-red-400">{{ errors.operator }}</p>
          </div>

          <div class="space-y-1.5">
            <Label for="thresholdValue">Threshold Value</Label>
            <Input
              id="thresholdValue"
              v-model.number="thresholdValue"
              type="number"
              step="any"
              :disabled="selectedFeature?.dataType === 'boolean'"
            />
            <p v-if="selectedFeature?.dataType === 'boolean'" class="text-[11px] text-slate-500">
              Boolean features use threshold 1.
            </p>
            <p v-if="errors.thresholdValue" class="text-xs text-red-600 dark:text-red-400">{{ errors.thresholdValue }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <Label for="severity">Severity</Label>
            <select
              id="severity"
              v-model="severity"
              class="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm dark:bg-slate-950"
            >
              <option value="">Select…</option>
              <option v-for="opt in severityOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <p v-if="errors.severity" class="text-xs text-red-600 dark:text-red-400">{{ errors.severity }}</p>
          </div>

          <div class="space-y-1.5">
            <Label for="scoreImpact">Score Impact (0–100)</Label>
            <Input id="scoreImpact" v-model.number="scoreImpact" type="number" min="0" max="100" />
            <p v-if="errors.scoreImpact" class="text-xs text-red-600 dark:text-red-400">{{ errors.scoreImpact }}</p>
          </div>
        </div>

        <div class="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
          <div>
            <Label for="isEnabled" class="text-sm">Enabled</Label>
            <p class="text-xs text-slate-500 dark:text-slate-400">Rule is active when enabled.</p>
          </div>
          <Switch id="isEnabled" v-model:checked="isEnabled" />
        </div>

        <DialogFooter class="gap-2 sm:gap-0">
          <Button type="button" variant="outline" :disabled="submitting" @click="emit('close')">
            Cancel
          </Button>
          <Button type="submit" :disabled="submitting">
            {{ submitting ? "Saving…" : isEditMode ? "Save Changes" : "Create Rule" }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
