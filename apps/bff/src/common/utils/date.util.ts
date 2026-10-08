const TIMEZONELESS_SLASH_PATTERN =
  /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
const TIMEZONELESS_DASH_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/;
const HAS_TIMEZONE_PATTERN = /(?:Z|[+-]\d{2}:\d{2})$/i;

/**
 * Normalizes upstream timestamps to ISO-8601 UTC.
 *
 * ASP.NET returns timezone-less UTC strings such as "2026/08/09 14:41:17".
 * Those must be parsed as UTC instants, not local server time.
 */
export function toUtcIsoString(
  value: string | Date | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const slashMatch = trimmed.match(TIMEZONELESS_SLASH_PATTERN);
  if (slashMatch) {
    const [, year, month, day, hour, minute, second] = slashMatch;
    return new Date(
      Date.UTC(+year, +month - 1, +day, +hour, +minute, +second),
    ).toISOString();
  }

  const dashMatch = trimmed.match(TIMEZONELESS_DASH_PATTERN);
  if (dashMatch && !HAS_TIMEZONE_PATTERN.test(trimmed)) {
    const [, year, month, day, hour, minute, second, millis] = dashMatch;
    const ms = millis ? Number(millis.padEnd(3, '0')) : 0;
    return new Date(
      Date.UTC(+year, +month - 1, +day, +hour, +minute, +second, ms),
    ).toISOString();
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}
