const DEFAULT_DEV_BASE_URL = 'http://localhost:4000';

export interface FraudServiceConfig {
  baseUrl: string;
  requestTimeoutMs: number;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function resolveFraudServiceBaseUrl(): string {
  const raw = process.env.FRAUD_SERVICE_BASE_URL?.trim();

  if (raw) {
    return normalizeBaseUrl(raw);
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'FRAUD_SERVICE_BASE_URL is required when NODE_ENV=production.',
    );
  }

  return DEFAULT_DEV_BASE_URL;
}

export function createFraudServiceConfig(): FraudServiceConfig {
  return {
    baseUrl: resolveFraudServiceBaseUrl(),
    requestTimeoutMs: Number(process.env.FRAUD_SERVICE_TIMEOUT_MS ?? 30_000),
  };
}

/** @deprecated Use createFraudServiceConfig() — kept for gradual migration */
export const FRAUD_CONFIG = {
  get BASE_URL(): string {
    return resolveFraudServiceBaseUrl();
  },
};
