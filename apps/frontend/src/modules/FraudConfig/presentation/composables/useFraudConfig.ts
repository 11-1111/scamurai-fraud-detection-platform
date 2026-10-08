import { ref, onMounted } from "vue";
import { toast } from "@/components/ui/toast";
import type {
  CreateFraudRulePayload,
  FraudFeatureConfig,
  FraudRule,
  PolicyRule,
  RiskLevel,
  UpdateFraudRulePayload,
} from "../../domain/entities/FraudConfig";
import { HttpFraudConfigRepository } from "../../infrastructure/repositories/HttpFraudConfigRepository";
import { GetFraudConfig } from "../../application/use-cases/GetFraudConfig";
import { GetFraudFeatures } from "../../application/use-cases/GetFraudFeatures";
import { CreateFraudRule } from "../../application/use-cases/CreateFraudRule";
import { UpdateFraudRule } from "../../application/use-cases/UpdateFraudRule";
import { EnableFraudRule } from "../../application/use-cases/EnableFraudRule";
import { DisableFraudRule } from "../../application/use-cases/DisableFraudRule";

const repo = new HttpFraudConfigRepository();
const getConfig = new GetFraudConfig(repo);
const getFeatures = new GetFraudFeatures(repo);
const createRule = new CreateFraudRule(repo);
const updateRule = new UpdateFraudRule(repo);
const enableRule = new EnableFraudRule(repo);
const disableRule = new DisableFraudRule(repo);

export function useFraudConfig() {
  const rules = ref<FraudRule[]>([]);
  const riskLevels = ref<RiskLevel[]>([]);
  const policies = ref<PolicyRule[]>([]);
  const features = ref<FraudFeatureConfig[]>([]);
  const isLoading = ref(false);
  const featuresLoading = ref(false);
  const actionLoading = ref(false);
  const error = ref<Error | null>(null);

  async function loadRules() {
    rules.value = await repo.getRules();
  }

  async function load() {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await getConfig.execute();
      rules.value = result.rules;
      riskLevels.value = result.riskLevels;
      policies.value = result.policies;
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
      rules.value = [];
      riskLevels.value = [];
      policies.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function loadFeatureCatalog() {
    featuresLoading.value = true;
    try {
      features.value = await getFeatures.execute();
    } catch (e) {
      if (!error.value) {
        error.value = e instanceof Error ? e : new Error(String(e));
      }
      features.value = [];
    } finally {
      featuresLoading.value = false;
    }
  }

  async function createFraudRule(payload: CreateFraudRulePayload) {
    actionLoading.value = true;
    try {
      await createRule.execute(payload);
      await loadRules();
      toast({ title: "Rule created", description: `"${payload.ruleName}" was created successfully.` });
    } catch (e) {
      throw e instanceof Error ? e : new Error(String(e));
    } finally {
      actionLoading.value = false;
    }
  }

  async function updateFraudRule(id: number, payload: UpdateFraudRulePayload) {
    actionLoading.value = true;
    try {
      await updateRule.execute(id, payload);
      await loadRules();
      toast({ title: "Rule updated", description: "Fraud rule was saved successfully." });
    } catch (e) {
      throw e instanceof Error ? e : new Error(String(e));
    } finally {
      actionLoading.value = false;
    }
  }

  async function enableFraudRule(id: number) {
    actionLoading.value = true;
    try {
      await enableRule.execute(id);
      await loadRules();
      toast({ title: "Rule enabled", description: "The fraud rule is now active." });
    } catch (e) {
      throw e instanceof Error ? e : new Error(String(e));
    } finally {
      actionLoading.value = false;
    }
  }

  async function disableFraudRule(id: number) {
    actionLoading.value = true;
    try {
      await disableRule.execute(id);
      await loadRules();
      toast({ title: "Rule disabled", description: "The fraud rule has been disabled." });
    } catch (e) {
      throw e instanceof Error ? e : new Error(String(e));
    } finally {
      actionLoading.value = false;
    }
  }

  onMounted(() => {
    load();
    loadFeatureCatalog();
  });

  return {
    rules,
    riskLevels,
    policies,
    features,
    isLoading,
    featuresLoading,
    actionLoading,
    error,
    load,
    loadRules,
    loadFeatureCatalog,
    createFraudRule,
    updateFraudRule,
    enableFraudRule,
    disableFraudRule,
  };
}

/** Alias matching the POC naming */
export const useFraudConfiguration = useFraudConfig;
