/**
 * API base URL for the BFF. Use VITE_API_BASE_URL in .env or default to localhost.
 */
const env = typeof import.meta !== "undefined" ? import.meta.env : undefined;
export const API_BASE_URL =
  (env && (env as Record<string, string>).VITE_API_BASE_URL) || "http://localhost:3000";

export const BFF_FRAUD_ALERTS_PATH = "/bff/fraud/alerts";
export const BFF_FRAUD_TRANSACTIONS_PATH = "/bff/fraud/transactions";
export const BFF_FRAUD_EVALUATIONS_PATH = "/bff/fraud/evaluations";
export const BFF_FRAUD_CONFIG_PATH = "/bff/fraud/config";
