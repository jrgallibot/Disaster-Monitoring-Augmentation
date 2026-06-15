import type { MobilizationStatus } from "@/lib/types";

export const MOBILIZATION_STATUS_LABELS: Record<MobilizationStatus, string> = {
  mobilized: "Mobilized",
  demobilized: "Demobilized",
};

export const MOBILIZATION_STATUS_COLORS: Record<MobilizationStatus, string> = {
  mobilized: "#16A34A",
  demobilized: "#6B7280",
};

export function getMobilizationStatusLabel(status: MobilizationStatus | null | undefined): string {
  if (!status) return "—";
  return MOBILIZATION_STATUS_LABELS[status] ?? status;
}

export function formatMobilizationDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(`${date}T12:00:00`));
}

export function computeAugmentationDurationDays(
  mobilizedAt: string | null,
  demobilizedAt: string | null,
  asOfDateKey?: string
): number | null {
  if (!mobilizedAt) return null;
  const start = new Date(`${mobilizedAt}T12:00:00`);
  const endKey = demobilizedAt ?? asOfDateKey ?? new Date().toISOString().slice(0, 10);
  const end = new Date(`${endKey}T12:00:00`);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return null;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

export function employeeOverlapsMobilizationRange(
  mobilizedAt: string | null,
  demobilizedAt: string | null,
  dateFrom: string,
  dateTo: string
): boolean {
  if (!mobilizedAt) return false;
  if (mobilizedAt > dateTo) return false;
  if (demobilizedAt && demobilizedAt < dateFrom) return false;
  return true;
}

export function validateMobilizationUpdate(input: {
  status: MobilizationStatus;
  mobilizedAt: string;
  demobilizedAt?: string | null;
}): string | null {
  const { status, mobilizedAt, demobilizedAt } = input;

  if (!mobilizedAt?.trim()) {
    return "Mobilized date is required.";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(mobilizedAt)) {
    return "Mobilized date must be a valid date.";
  }

  if (status === "demobilized") {
    if (!demobilizedAt?.trim()) {
      return "Demobilized date is required when status is Demobilized.";
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(demobilizedAt)) {
      return "Demobilized date must be a valid date.";
    }
    if (demobilizedAt < mobilizedAt) {
      return "Demobilized date cannot be earlier than mobilized date.";
    }
  }

  return null;
}
