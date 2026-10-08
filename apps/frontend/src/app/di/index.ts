import type { App } from "vue";
import { createTransactionsProviders } from "@/modules/Transactions";
import { createFraudAlertsProviders } from "@/modules/FraudAlerts";

export function registerDI(app: App) {
  for (const [key, value] of createTransactionsProviders()) {
    app.provide(key, value);
  }

  for (const [key, value] of createFraudAlertsProviders()) {
    app.provide(key, value);
  }
}
