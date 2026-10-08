export const DISPLAY_TIMEZONE = "Africa/Nairobi";

const dateTimeFormatter = new Intl.DateTimeFormat("en-KE", {
  timeZone: DISPLAY_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function parseDate(value: string | number | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function partValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes
): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

/**
 * Formats a UTC ISO-8601 (or other parseable) timestamp for display in Kenya (Africa/Nairobi).
 * Output shape: 2026/08/09 17:41:17
 */
export function formatDateTime(
  value?: string | number | Date | null
): string {
  if (value == null || value === "") return "—";

  const date = parseDate(value);
  if (!date) return "—";

  const parts = dateTimeFormatter.formatToParts(date);
  const year = partValue(parts, "year");
  const month = partValue(parts, "month");
  const day = partValue(parts, "day");
  const hour = partValue(parts, "hour");
  const minute = partValue(parts, "minute");
  const second = partValue(parts, "second");

  return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
}

export function splitDateTime(
  value?: string | number | Date | null
): { date: string; time: string } {
  const formatted = formatDateTime(value);
  if (formatted === "—") return { date: "—", time: "" };

  const spaceIdx = formatted.indexOf(" ");
  if (spaceIdx === -1) return { date: formatted, time: "" };

  return {
    date: formatted.slice(0, spaceIdx),
    time: formatted.slice(spaceIdx + 1),
  };
}
