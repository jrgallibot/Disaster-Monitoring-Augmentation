import type { SexCount } from "@/lib/types";
import { formatSexBreakdown } from "@/lib/sex-stats";

interface SexBreakdownProps {
  count: SexCount;
  className?: string;
}

export function SexBreakdown({ count, className = "" }: SexBreakdownProps) {
  return (
    <p className={`text-xs text-muted-foreground mt-1 ${className}`}>
      {formatSexBreakdown(count)}
    </p>
  );
}
