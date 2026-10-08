import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import FraudAlertDecisionBadge from "../presentation/components/FraudAlertDecisionBadge.vue";
import FraudAlertRiskBadge from "../presentation/components/FraudAlertRiskBadge.vue";
import FraudAlertNetworkPanel from "../presentation/components/FraudAlertNetworkPanel.vue";
import FraudAlertRulesPanel from "../presentation/components/FraudAlertRulesPanel.vue";
import FraudFeaturesTable from "@/modules/FraudConfig/presentation/components/FraudFeaturesTable.vue";
import FraudSummaryBadge from "@/modules/Transactions/presentation/components/FraudSummaryBadge.vue";
import DefaultLayout from "@/app/layout/DefaultLayout.vue";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("alert detail badges", () => {
  it("renders risk and decision", () => {
    const risk = mount(FraudAlertRiskBadge, { props: { level: "HIGH" } });
    const decision = mount(FraudAlertDecisionBadge, { props: { decision: "BLOCK" } });
    expect(risk.text()).toContain("HIGH");
    expect(decision.text()).toContain("BLOCK");
  });
});

describe("triggered rules panel", () => {
  it("shows actual value and threshold", () => {
    const wrapper = mount(FraudAlertRulesPanel, {
      props: {
        rules: [
          {
            ruleCode: "R1",
            ruleName: "Velocity",
            featureName: "count",
            operator: ">",
            actualValue: 9,
            thresholdValue: 3,
            scoreImpact: 20,
            severity: "HIGH",
            message: "Exceeded",
          },
        ],
      },
    });
    expect(wrapper.text()).toContain("9");
    expect(wrapper.text()).toContain("3");
    expect(wrapper.text()).toContain("Velocity");
  });
});

describe("graph panel", () => {
  it("receives nodes and edges via Vue Flow when graph present", () => {
    const wrapper = mount(FraudAlertNetworkPanel, {
      props: {
        graph: {
          nodes: [{ id: "n1", label: "A", type: "Email" }],
          edges: [{ id: "e1", source: "n1", target: "n2", label: "link" }],
        },
      },
      global: {
        stubs: {
          FraudNetworkPanel: {
            name: "FraudNetworkPanel",
            props: ["graph"],
            template: `<div data-testid="vue-flow-graph">nodes:{{ graph.nodes.length }} edges:{{ graph.edges.length }}</div>`,
          },
        },
      },
    });
    expect(wrapper.get("[data-testid='vue-flow-graph']").text()).toContain("nodes:1");
    expect(wrapper.get("[data-testid='vue-flow-graph']").text()).toContain("edges:1");
  });

  it("displays empty graph state", () => {
    const wrapper = mount(FraudAlertNetworkPanel, {
      props: { graph: { nodes: [], edges: [] } },
    });
    expect(wrapper.text()).toMatch(/no network graph/i);
  });
});

describe("FraudSummaryBadge navigation", () => {
  it("navigates to alert detail when alertId exists", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div />" } },
        {
          path: "/fraud-alerts/:id",
          name: "FraudAlertDetails",
          component: { template: "<div />" },
        },
      ],
    });
    await router.push("/");
    await router.isReady();

    const pushSpy = vi.spyOn(router, "push");

    const wrapper = mount(FraudSummaryBadge, {
      props: {
        summary: {
          isFlagged: true,
          alertId: "alert-99",
          evaluationId: null,
          riskScore: 70,
          riskLevel: "HIGH",
          decision: "REVIEW",
          severity: "HIGH",
          evaluationStatus: null,
        },
      },
      global: { plugins: [router] },
    });

    await wrapper.get("button").trigger("click");
    await flushPromises();
    expect(pushSpy).toHaveBeenCalledWith({
      name: "FraudAlertDetails",
      params: { id: "alert-99" },
    });
  });
});

describe("configuration features table", () => {
  it("renders features catalog columns", () => {
    const wrapper = mount(FraudFeaturesTable, {
      props: {
        features: [
          {
            featureName: "txCount1h",
            label: "TX Count 1h",
            description: "Velocity",
            category: "Velocity",
            dataType: "number",
            supportedOperators: [">", ">="],
            unit: "count",
            windowSeconds: 3600,
            version: "1.0",
          },
        ],
        isLoading: false,
      },
    });
    expect(wrapper.text()).toContain("txCount1h");
    expect(wrapper.text()).toContain("Velocity");
    expect(wrapper.text()).toContain("number");
    expect(wrapper.text()).toContain(">, >=");
  });
});

describe("route metadata / layout title", () => {
  it("updates layout title from route meta", async () => {
    const router = createRouter({
      history: createMemoryHistory("/api3dash/"),
      routes: [
        {
          path: "/",
          component: DefaultLayout,
          children: [
            {
              path: "fraud-alerts",
              name: "FraudAlerts",
              component: { template: "<div />" },
              meta: {
                title: "Fraud Alerts",
                description: "Review transactions flagged by fraud rules and policies.",
              },
            },
            {
              path: "transactions",
              name: "Transactions",
              component: { template: "<div />" },
              meta: {
                title: "Transactions",
                description: "Monitor and investigate payment transactions.",
              },
            },
          ],
        },
      ],
    });

    router.push("/fraud-alerts");
    await router.isReady();

    const wrapper = mount(DefaultLayout, {
      global: {
        plugins: [router],
        stubs: {
          AppSidebar: true,
          Logo: true,
          Teleport: true,
        },
      },
    });

    expect(wrapper.text()).toContain("Fraud Alerts");
    expect(wrapper.text()).toContain("Review transactions flagged by fraud rules and policies.");
  });
});

describe("no direct fraud microservice calls", () => {
  it("does not target localhost:4000 anywhere in src", () => {
    const projectRoot = path.resolve(__dirname, "../../../..");
    const hits: string[] = [];
    const forbidden = "localhost" + ":4000";

    function walk(dir: string) {
      for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name === "dist" || name.startsWith(".") || name === "__tests__") {
          continue;
        }
        const full = path.join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) walk(full);
        else if (/\.(ts|vue|js)$/.test(name) && !/\.(spec|test)\.ts$/.test(name)) {
          const text = readFileSync(full, "utf8");
          if (text.includes(forbidden)) {
            hits.push(path.relative(projectRoot, full));
          }
        }
      }
    }

    walk(path.join(projectRoot, "src"));
    expect(hits).toEqual([]);
  });
});
