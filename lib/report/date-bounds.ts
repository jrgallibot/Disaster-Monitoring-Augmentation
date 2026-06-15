import { DEPLOYMENT_TIMEZONE } from "@/lib/deployment-daily";
import { formatDateLong } from "@/lib/utils";

export interface ReportDateBounds {
  dateKey: string;
  start: string;
  end: string;
  label: string;
  isToday: boolean;
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getManilaDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DEPLOYMENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function getReportDateBounds(dateKeyInput?: string | null): ReportDateBounds {
  const todayKey = getManilaDateKey();
  const dateKey =
    dateKeyInput && DATE_KEY_PATTERN.test(dateKeyInput) ? dateKeyInput : todayKey;
  const isToday = dateKey === todayKey;
  const start = new Date(`${dateKey}T00:00:00+08:00`);
  const end = new Date(`${addDaysToDateKey(dateKey, 1)}T00:00:00+08:00`);

  return {
    dateKey,
    start: start.toISOString(),
    end: end.toISOString(),
    label: formatDateLong(start),
    isToday,
  };
}

export function getTodayInputValue(): string {
  return getManilaDateKey();
}

export function getManilaDateKeyFromTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DEPLOYMENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** Map a calendar date (PH) to a timestamp, using the current PH clock time. */
export function accomplishmentTimestampFromDateKey(dateKeyInput?: string | null): string {
  const dateKey =
    dateKeyInput && DATE_KEY_PATTERN.test(dateKeyInput) ? dateKeyInput : getManilaDateKey();
  const now = new Date();
  const manilaTime = now.toLocaleString("en-GB", {
    timeZone: DEPLOYMENT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return new Date(`${dateKey}T${manilaTime}+08:00`).toISOString();
}

/** Change only the calendar date while keeping the original PH time-of-day. */
export function accomplishmentTimestampWithDateKey(
  dateKeyInput: string,
  existingIso: string
): string {
  if (!DATE_KEY_PATTERN.test(dateKeyInput)) {
    return existingIso;
  }
  const existing = new Date(existingIso);
  const manilaTime = existing.toLocaleString("en-GB", {
    timeZone: DEPLOYMENT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return new Date(`${dateKeyInput}T${manilaTime}+08:00`).toISOString();
}
