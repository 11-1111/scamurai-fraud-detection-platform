import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildAlertQuery,
  mapAlertDetail,
  mapAlertList,
  mapTriggeredRule,
} from "../application/mappers/fraudAlertMapper";
import { formatFeatureDisplayValue } from "../presentation/utils/formatFeatureValue";
import { mapApiTransactionToDomain } from "@/modules/Transactions/application/mappers/apiTransactionMapper";
import type { ApiTransaction } from "@/modules/Transactions/application/dto/ApiTransactionDTO";

describe("fraudAlertMapper — list mapping", () => {
  it("maps BFF alert list results correctly", () => {
    const result = mapAlertList({
      page: 2,
      pageSize: 10,
      total: 25,
      alerts: [
        {
          id: "alert-1",
          fraudTransactionId: "tx-1",
          rootIdentifierType: "Email",
          rootIdentifierValue: "a@b.com",
          riskScore: 82,
          riskLevel: "HIGH",
          severity: "CRITICAL",
          decision: "BLOCK",
          status: "OPEN",
          merchantName: "Acme",
          customerName: "Jane",
          customerEmail: "jane@acme.com",
          createdAt: "2026-07-01T10:00:00Z",
          assignedTo: "analyst@api3.com",
        },
      ],
    });

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.total).toBe(25);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toMatchObject({
      id: "alert-1",
      fraudTransactionId: "tx-1",
      rootIdentifierType: "Email",
      rootIdentifierValue: "a@b.com",
      riskScore: 82,
      riskLevel: "HIGH",
      severity: "CRITICAL",
      decision: "BLOCK",
      finalDecision: "BLOCK",
      status: "OPEN",
      alertStatus: "OPEN",
      merchantName: "Acme",
      customerEmail: "jane@acme.com",
    });
  });
});

describe("buildAlertQuery — filters", () => {
  it("generates the correct query parameters", () => {
    const qs = buildAlertQuery({
      page: 1,
      pageSize: 20,
      status: "OPEN",
      severity: "HIGH",
      riskLevel: "CRITICAL",
      decision: "BLOCK",
      search: "acme",
      from: "2026-07-01",
      to: "2026-07-31",
      sortBy: "createdAt",
      sortDir: "desc",
      empty: "",
      skip: undefined,
    });

    const params = new URLSearchParams(qs.replace(/^\?/, ""));
    expect(params.get("page")).toBe("1");
    expect(params.get("pageSize")).toBe("20");
    expect(params.get("status")).toBe("OPEN");
    expect(params.get("severity")).toBe("HIGH");
    expect(params.get("riskLevel")).toBe("CRITICAL");
    expect(params.get("decision")).toBe("BLOCK");
    expect(params.get("search")).toBe("acme");
    expect(params.get("from")).toBe("2026-07-01");
    expect(params.get("to")).toBe("2026-07-31");
    expect(params.get("sortBy")).toBe("createdAt");
    expect(params.get("sortDir")).toBe("desc");
    expect(params.has("empty")).toBe(false);
    expect(params.has("skip")).toBe(false);
  });
});

describe("mapAlertDetail — risk and decision", () => {
  it("maps risk score, level and decision for detail rendering", () => {
    const detail = mapAlertDetail({
      id: "alert-9",
      riskScore: 91,
      riskLevel: "CRITICAL",
      decision: "BLOCK",
      status: "UNDER_REVIEW",
      createdAt: "2026-07-02T12:00:00Z",
      triggeredRules: [
        {
          ruleCode: "VEL_01",
          ruleName: "Velocity spike",
          featureName: "txCount1h",
          operator: ">",
          thresholdValue: 5,
          actualValue: 12,
          scoreImpact: 40,
          severity: "HIGH",
          message: "Too many txs",
        },
      ],
      latestEvaluation: {
        id: "eval-1",
        status: "COMPLETED",
        riskScore: 91,
        riskLevel: "CRITICAL",
        policyDecision: "BLOCK",
        graph: {
          nodes: [{ id: "n1", label: "Email", type: "Email" }],
          edges: [{ id: "e1", source: "n1", target: "n2", label: "used" }],
        },
      },
    });

    expect(detail.riskScore).toBe(91);
    expect(detail.riskLevel).toBe("CRITICAL");
    expect(detail.decision).toBe("BLOCK");
    expect(detail.finalDecision).toBe("BLOCK");
    expect(detail.triggeredRules[0]?.actualValue).toBe(12);
    expect(detail.triggeredRules[0]?.thresholdValue).toBe(5);
    expect(detail.graph.nodes).toHaveLength(1);
    expect(detail.graph.edges).toHaveLength(1);
  });
});

describe("mapTriggeredRule", () => {
  it("shows actual value and threshold", () => {
    const rule = mapTriggeredRule({
      ruleCode: "R1",
      ruleName: "Rule 1",
      actualValue: 3.5,
      thresholdValue: 2,
      scoreImpact: 10,
      severity: "MEDIUM",
    });
    expect(rule.actualValue).toBe(3.5);
    expect(rule.thresholdValue).toBe(2);
  });
});

describe("formatFeatureDisplayValue", () => {
  it("renders numeric features correctly", () => {
    expect(formatFeatureDisplayValue(12.5, "number")).toBe("12.5");
    expect(formatFeatureDisplayValue(0)).toBe("0");
  });

  it("renders boolean features as True/False not 1/0", () => {
    expect(formatFeatureDisplayValue(true, "boolean")).toBe("True");
    expect(formatFeatureDisplayValue(false, "boolean")).toBe("False");
    expect(formatFeatureDisplayValue(1, "boolean")).toBe("True");
    expect(formatFeatureDisplayValue(0, "boolean")).toBe("False");
  });

  it("renders null as em dash", () => {
    expect(formatFeatureDisplayValue(null)).toBe("—");
  });
});

describe("transactions fraudSummary", () => {
  const baseApi: ApiTransaction = {
    date: "2026-07-01",
    merchant: { name: "Shop" },
    amount: { full: "10.00 EGP", currency: "EGP", value: "10" },
    status: { text: "Success", type: "success" },
    customer: { name: "Bob" },
  };

  it("keeps transactions without fraudSummary valid", () => {
    const tx = mapApiTransactionToDomain(baseApi);
    expect(tx.fraudSummary).toBeUndefined();
    expect(tx.merchantName).toBe("Shop");
  });

  it("maps flagged fraudSummary for badge navigation", () => {
    const tx = mapApiTransactionToDomain({
      ...baseApi,
      fraudSummary: {
        isFlagged: true,
        alertId: "alert-42",
        evaluationId: "eval-7",
        riskScore: 77,
        riskLevel: "HIGH",
        decision: "REVIEW",
        severity: "HIGH",
        evaluationStatus: "COMPLETED",
      },
    });
    expect(tx.fraudSummary?.isFlagged).toBe(true);
    expect(tx.fraudSummary?.alertId).toBe("alert-42");
    expect(tx.fraudSummary?.riskLevel).toBe("HIGH");
    expect(tx.fraudSummary?.riskScore).toBe(77);
  });
});

describe("empty graph", () => {
  it("returns empty nodes/edges when graph missing", () => {
    const detail = mapAlertDetail({
      id: "a1",
      riskScore: 10,
      riskLevel: "LOW",
      decision: "ALLOW",
      status: "OPEN",
      createdAt: "2026-07-01T00:00:00Z",
    });
    expect(detail.graph.nodes).toEqual([]);
    expect(detail.graph.edges).toEqual([]);
  });
});

describe("AddFraudAlertNote BFF path", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 201,
        json: async () => ({ id: 1, note: "hello", createdAt: "2026-07-01T00:00:00Z" }),
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts notes to the BFF alerts notes endpoint", async () => {
    const { HttpFraudAlertsRepository } = await import(
      "../infrastructure/repositories/HttpFraudAlertsRepository"
    );
    const repo = new HttpFraudAlertsRepository();
    await repo.addAlertNote("alert-1", { note: "hello", createdBy: "analyst" });

    expect(fetch).toHaveBeenCalled();
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/bff/fraud/alerts/alert-1/notes");
    expect(url).not.toContain(":4000");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({ note: "hello", createdBy: "analyst" });
  });
});

describe("API failures", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("surfaces a retryable error message from BFF failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: async () => ({ message: "Fraud service unavailable" }),
      }))
    );

    const { HttpFraudAlertsRepository } = await import(
      "../infrastructure/repositories/HttpFraudAlertsRepository"
    );
    const repo = new HttpFraudAlertsRepository();
    await expect(repo.getAlert("missing")).rejects.toThrow(/503|Fraud service unavailable/i);
  });
});
