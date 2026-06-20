"use client";

import { useCallback, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sectionAccentStyles, type SectionAccent } from "@/components/dashboard/DashboardSection";
import { Compass } from "lucide-react";

export interface DashboardNavSection {
  id: string;
  label: string;
  accent: SectionAccent;
}

interface DashboardSectionNavProps {
  sections: DashboardNavSection[];
}

export function DashboardSectionNav({ sections }: DashboardSectionNavProps) {
  const [value, setValue] = useState("");

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-2", "ring-dswd-gold", "ring-offset-2");
    window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-dswd-gold", "ring-offset-2");
    }, 1800);
  }, []);

  function handleSelect(id: string) {
    setValue(id);
    scrollTo(id);
  }

  return (
    <nav
      aria-label="Dashboard section navigation"
      className="sticky top-0 z-20 print:hidden rounded-lg border border-dswd-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 shadow-sm px-4 py-3"
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <p className="text-sm font-semibold text-dswd-navy flex items-center gap-2 shrink-0">
          <Compass className="h-4 w-4 text-dswd-blue" />
          Jump to section
        </p>

        <Select value={value} onValueChange={handleSelect}>
          <SelectTrigger className="w-full lg:w-[360px] bg-white">
            <SelectValue placeholder="Select a section..." />
          </SelectTrigger>
          <SelectContent>
            {sections.map((section) => (
              <SelectItem key={section.id} value={section.id}>
                <span className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${sectionAccentStyles[section.accent].dot}`}
                    aria-hidden
                  />
                  {section.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="hidden xl:flex flex-wrap items-center gap-2 lg:ml-auto">
          {sections.map((section) => {
            const styles = sectionAccentStyles[section.accent];
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => handleSelect(section.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80 ${styles.badge}`}
              >
                <span className={`h-2 w-2 rounded-full ${styles.dot}`} aria-hidden />
                <span className="max-w-[180px] truncate">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
