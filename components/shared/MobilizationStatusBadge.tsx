import { Badge } from "@/components/ui/badge";
import {
  getMobilizationStatusLabel,
  MOBILIZATION_STATUS_COLORS,
} from "@/lib/mobilization";
import type { MobilizationStatus } from "@/lib/types";

interface MobilizationStatusBadgeProps {
  status: MobilizationStatus;
  className?: string;
  interactive?: boolean;
}

export function MobilizationStatusBadge({
  status,
  className,
  interactive = false,
}: MobilizationStatusBadgeProps) {
  return (
    <Badge
      color={MOBILIZATION_STATUS_COLORS[status]}
      className={`${interactive ? "cursor-pointer hover:opacity-90" : ""} ${className ?? ""}`}
    >
      {getMobilizationStatusLabel(status)}
    </Badge>
  );
}
