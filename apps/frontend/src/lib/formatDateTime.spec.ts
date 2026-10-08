import { describe, expect, it } from "vitest";
import {
  DISPLAY_TIMEZONE,
  formatDateTime,
  splitDateTime,
} from "./formatDateTime";

describe("formatDateTime", () => {
  it("formats UTC ISO timestamps in Africa/Nairobi", () => {
    expect(formatDateTime("2026-08-09T14:41:17.000Z")).toBe(
      "2026/08/09 17:41:17"
    );
  });

  it("uses Africa/Nairobi regardless of runtime timezone", () => {
    const formatted = new Intl.DateTimeFormat("en-KE", {
      timeZone: DISPLAY_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date("2026-08-09T14:41:17.000Z"));

    expect(formatDateTime("2026-08-09T14:41:17.000Z")).toContain(
      formatted.split(", ").pop()?.split(" ")[1] ?? "17:41:17"
    );
  });

  it("returns em dash for null, undefined, empty, and invalid values", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
    expect(formatDateTime("")).toBe("—");
    expect(formatDateTime("not-a-date")).toBe("—");
  });

  it("splits formatted output into date and time parts", () => {
    expect(splitDateTime("2026-08-09T14:41:17.000Z")).toEqual({
      date: "2026/08/09",
      time: "17:41:17",
    });
    expect(splitDateTime(null)).toEqual({ date: "—", time: "" });
  });
});
