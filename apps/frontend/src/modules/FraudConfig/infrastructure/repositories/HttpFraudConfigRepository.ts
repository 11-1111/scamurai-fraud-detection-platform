import type {
  CreateFraudRulePayload,
  FraudFeatureConfig,
  FraudRule,
  FraudRuleConfig,
  PolicyRule,
  RiskLevel,
  UpdateFraudRulePayload,
} from "../../domain/entities/FraudConfig";

const env = typeof import.meta !== "undefined" ? import.meta.env : undefined;
const API_BASE_URL =
  (env && (env as Record<string, string>).VITE_API_BASE_URL) || "http://localhost:3000";

const BFF_FEATURES_PATH = "/bff/fraud/config/features";
const BFF_RULES_PATH = "/bff/fraud/config/rules";
const BFF_RISK_LEVELS_PATH = "/bff/fraud/config/risk-levels";
const BFF_POLICIES_PATH = "/bff/fraud/config/policies";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { message?: string; error?: string };
      detail = body.message ?? body.error ?? "";
    } catch {
      // ignore parse errors
    }
    throw new Error(
      detail
        ? `Fraud Config API error: ${res.status} ${res.statusText} — ${detail}`
        : `Fraud Config API error: ${res.status} ${res.statusText} (${path})`
    );
  }

  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

async function getJson<T>(path: string): Promise<T> {
  return request<T>(path);
}

function toArray<T>(raw: unknown, key?: string): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (key && Array.isArray(obj[key])) return obj[key] as T[];
    for (const k of ["data", "items", "results", "features"]) {
      if (Array.isArray(obj[k])) return obj[k] as T[];
    }
  }
  return [];
}

function resolveEnabled(item: Record<string, unknown>): boolean {
  if (typeof item["enabled"] === "boolean") return item["enabled"];
  if (typeof item["isEnabled"] === "boolean") return item["isEnabled"];
  return true;
}

function normaliseFeature(item: Record<string, unknown>): FraudFeatureConfig {
  const operators = item["supportedOperators"];
  return {
    featureName: String(item["featureName"] ?? ""),
    label: String(item["label"] ?? item["featureName"] ?? ""),
    description: String(item["description"] ?? ""),
    category: String(item["category"] ?? "Other"),
    dataType: String(item["dataType"] ?? item["type"] ?? "number") as FraudFeatureConfig["dataType"],
    supportedOperators: Array.isArray(operators)
      ? operators.map((o) => String(o))
      : [],
    unit: item["unit"] != null ? String(item["unit"]) : null,
    windowSeconds: item["windowSeconds"] != null ? Number(item["windowSeconds"]) : null,
    version: item["version"] != null ? String(item["version"]) : null,
  };
}

function normaliseRuleConfig(item: Record<string, unknown>): FraudRuleConfig {
  return {
    id: Number(item["id"] ?? 0),
    ruleCode: String(item["ruleCode"] ?? ""),
    ruleName: String(item["ruleName"] ?? ""),
    description: item["description"] != null ? String(item["description"]) : null,
    featureName: String(item["featureName"] ?? ""),
    operator: String(item["operator"] ?? ""),
    thresholdValue: Number(item["thresholdValue"] ?? 0),
    severity: String(item["severity"] ?? ""),
    scoreImpact: Number(item["scoreImpact"] ?? 0),
    isEnabled: resolveEnabled(item),
    createdAt: item["createdAt"] != null ? String(item["createdAt"]) : undefined,
    updatedAt: item["updatedAt"] != null ? String(item["updatedAt"]) : null,
  };
}

function normaliseRule(item: Record<string, unknown>): FraudRule {
  const config = normaliseRuleConfig(item);
  return {
    ...config,
    enabled: config.isEnabled,
  };
}

function normaliseRiskLevel(item: Record<string, unknown>): RiskLevel {
  return {
    levelCode: String(item["levelCode"] ?? item["level"] ?? ""),
    minScore: Number(item["minScore"] ?? 0),
    maxScore: Number(item["maxScore"] ?? 0),
    defaultDecision: String(item["defaultDecision"] ?? ""),
    displayColor: String(item["displayColor"] ?? ""),
    priority: Number(item["priority"] ?? 0),
    enabled: resolveEnabled(item),
  };
}

function normalisePolicy(item: Record<string, unknown>): PolicyRule {
  return {
    policyCode: String(item["policyCode"] ?? ""),
    policyName: String(item["policyName"] ?? ""),
    conditionFeature: String(item["conditionFeature"] ?? ""),
    operator: String(item["operator"] ?? ""),
    conditionValue: Number(item["conditionValue"] ?? 0),
    minScore: item["minScore"] != null ? Number(item["minScore"]) : undefined,
    maxScore: item["maxScore"] != null ? Number(item["maxScore"]) : undefined,
    riskLevel: item["riskLevel"] != null ? String(item["riskLevel"]) : undefined,
    decision: String(item["decision"] ?? ""),
    actionLabel: String(item["actionLabel"] ?? ""),
    priority: Number(item["priority"] ?? 0),
    enabled: resolveEnabled(item),
  };
}

export class HttpFraudConfigRepository {
  async getFeatures(): Promise<FraudFeatureConfig[]> {
    const raw = await getJson<unknown>(BFF_FEATURES_PATH);
    return toArray<Record<string, unknown>>(raw, "features").map(normaliseFeature);
  }

  async getRules(): Promise<FraudRule[]> {
    const raw = await getJson<unknown>(BFF_RULES_PATH);
    return toArray<Record<string, unknown>>(raw, "rules").map(normaliseRule);
  }

  async getRuleById(id: number): Promise<FraudRuleConfig> {
    const raw = await request<Record<string, unknown>>(
      `${BFF_RULES_PATH}/${encodeURIComponent(String(id))}`
    );
    const item =
      raw && typeof raw === "object" && raw["rule"] && typeof raw["rule"] === "object"
        ? (raw["rule"] as Record<string, unknown>)
        : raw;
    return normaliseRuleConfig(item);
  }

  async createRule(payload: CreateFraudRulePayload): Promise<FraudRuleConfig> {
    const raw = await request<Record<string, unknown>>(BFF_RULES_PATH, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const item =
      raw && typeof raw === "object" && raw["rule"] && typeof raw["rule"] === "object"
        ? (raw["rule"] as Record<string, unknown>)
        : raw;
    return normaliseRuleConfig(item);
  }

  async updateRule(id: number, payload: UpdateFraudRulePayload): Promise<FraudRuleConfig> {
    const raw = await request<Record<string, unknown>>(
      `${BFF_RULES_PATH}/${encodeURIComponent(String(id))}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
    const item =
      raw && typeof raw === "object" && raw["rule"] && typeof raw["rule"] === "object"
        ? (raw["rule"] as Record<string, unknown>)
        : raw;
    return normaliseRuleConfig(item);
  }

  async enableRule(id: number): Promise<void> {
    await request(`${BFF_RULES_PATH}/${encodeURIComponent(String(id))}/enable`, {
      method: "PATCH",
    });
  }

  async disableRule(id: number): Promise<void> {
    await request(`${BFF_RULES_PATH}/${encodeURIComponent(String(id))}/disable`, {
      method: "PATCH",
    });
  }

  async getRiskLevels(): Promise<RiskLevel[]> {
    const raw = await getJson<unknown>(BFF_RISK_LEVELS_PATH);
    return toArray<Record<string, unknown>>(raw, "riskLevels").map(normaliseRiskLevel);
  }

  async getPolicies(): Promise<PolicyRule[]> {
    const raw = await getJson<unknown>(BFF_POLICIES_PATH);
    return toArray<Record<string, unknown>>(raw, "policies").map(normalisePolicy);
  }
}
