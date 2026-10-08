/** Shared feature value formatting for Fraud Alerts UI + tests */
export function formatFeatureDisplayValue(
  value: string | number | boolean | null | undefined,
  valueType?: string
): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean" || valueType === "boolean") {
    return value === true || value === "true" || value === 1 ? "True" : "False";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
