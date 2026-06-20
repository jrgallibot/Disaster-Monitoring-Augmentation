import type { ReactNode } from "react";

export type SectionAccent = "indigo" | "emerald" | "amber" | "blue";

export const sectionAccentStyles: Record<
  SectionAccent,
  { section: string; dot: string; badge: string }
> = {
  indigo: {
    section:
      "border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50/80 to-white shadow-sm shadow-indigo-100/50",
    dot: "bg-indigo-500",
    badge: "bg-indigo-100 text-indigo-900 border-indigo-200",
  },
  emerald: {
    section:
      "border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/80 to-white shadow-sm shadow-emerald-100/50",
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-900 border-emerald-200",
  },
  amber: {
    section:
      "border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/80 to-white shadow-sm shadow-amber-100/50",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-900 border-amber-200",
  },
  blue: {
    section:
      "border-l-4 border-l-dswd-blue bg-gradient-to-br from-blue-50/80 to-white shadow-sm shadow-blue-100/50",
    dot: "bg-dswd-blue",
    badge: "bg-blue-100 text-dswd-navy border-blue-200",
  },
};

interface DashboardSectionProps {
  id: string;
  accent: SectionAccent;
  label: string;
  children: ReactNode;
}

export function DashboardSection({ id, accent, label, children }: DashboardSectionProps) {
  const styles = sectionAccentStyles[accent];

  return (
    <section
      id={id}
      aria-label={label}
      className={`scroll-mt-24 rounded-xl border border-dswd-border p-3 sm:p-4 ${styles.section}`}
    >
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold mb-3 ${styles.badge}`}
      >
        <span className={`h-2 w-2 rounded-full shrink-0 ${styles.dot}`} aria-hidden />
        {label}
      </div>
      {children}
    </section>
  );
}
