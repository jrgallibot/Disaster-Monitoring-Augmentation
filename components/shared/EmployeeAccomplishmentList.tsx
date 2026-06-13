import { formatCoordinates, getMapUrl, hasValidCoordinates } from "@/lib/geo";
import { formatDate } from "@/lib/utils";
import type { EmployeeAccomplishment } from "@/lib/types";
import { MapPin } from "lucide-react";

interface EmployeeAccomplishmentListProps {
  records: EmployeeAccomplishment[];
  emptyMessage?: string;
  tabError?: string;
}

export function EmployeeAccomplishmentList({
  records,
  emptyMessage = "No accomplishments recorded yet.",
  tabError,
}: EmployeeAccomplishmentListProps) {
  return (
    <div className="space-y-4">
      {tabError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm">
          {tabError}
        </div>
      )}

      <p className="text-xs font-semibold text-dswd-navy uppercase tracking-wide">
        Accomplishment History ({records.length})
      </p>

      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <div key={record.id} className="border border-dswd-border rounded-lg p-4 space-y-2">
              <p className="text-xs text-muted-foreground">{formatDate(record.created_at)}</p>
              <p className="text-sm text-dswd-navy whitespace-pre-wrap">{record.content}</p>
              {hasValidCoordinates(record.latitude, record.longitude) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <a
                    href={getMapUrl(record.latitude, record.longitude)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dswd-blue hover:underline font-medium"
                  >
                    {formatCoordinates(record.latitude, record.longitude)}
                  </a>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
