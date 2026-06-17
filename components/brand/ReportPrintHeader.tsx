import { BrandLogoCluster } from "@/components/brand/BrandLogoCluster";
import { SYSTEM_NAME } from "@/lib/branding";
import { cn } from "@/lib/utils";

interface ReportPrintHeaderProps {
  reportTitle: string;
  lines?: string[];
  className?: string;
}

export function ReportPrintHeader({ reportTitle, lines = [], className }: ReportPrintHeaderProps) {
  return (
    <div
      className={cn(
        "hidden print:flex print:items-start print:gap-4 mb-6 border-b-2 border-dswd-gold pb-4",
        className
      )}
    >
      <BrandLogoCluster size="lg" className="shrink-0 print:flex" />
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold text-dswd-navy leading-tight">{SYSTEM_NAME}</h1>
        <h2 className="text-lg font-semibold text-dswd-navy mt-1">{reportTitle}</h2>
        {lines.map((line) => (
          <p key={line} className="text-sm text-muted-foreground mt-1">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
