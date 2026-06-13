import Image from "next/image";
import { formatCoordinates, getMapUrl, hasValidCoordinates } from "@/lib/geo";
import { formatDate } from "@/lib/utils";
import type { EmployeeAttendance } from "@/lib/types";
import { Camera, LogIn, LogOut, MapPin } from "lucide-react";

interface EmployeeAttendanceListProps {
  records: EmployeeAttendance[];
  emptyMessage?: string;
  showSelfies?: boolean;
}

function actionLabel(action: EmployeeAttendance["action"]) {
  return action === "time_in" ? "Time In" : "Time Out";
}

function actionColor(action: EmployeeAttendance["action"]) {
  return action === "time_in"
    ? "bg-green-100 text-green-800 border-green-200"
    : "bg-amber-100 text-amber-800 border-amber-200";
}

export function EmployeeAttendanceList({
  records,
  emptyMessage = "No attendance records yet.",
  showSelfies = false,
}: EmployeeAttendanceListProps) {
  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <div key={record.id} className="border border-dswd-border rounded-lg p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            {showSelfies && record.photo_url && (
              <a
                href={record.photo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
                title="View full selfie"
              >
                <div className="h-20 w-20 rounded-lg overflow-hidden border border-dswd-border bg-dswd-light">
                  <Image
                    src={record.photo_url}
                    alt={`${actionLabel(record.action)} selfie`}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
              </a>
            )}

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {record.action === "time_in" ? (
                    <LogIn className="h-4 w-4 text-green-700" />
                  ) : (
                    <LogOut className="h-4 w-4 text-amber-700" />
                  )}
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded border ${actionColor(record.action)}`}
                  >
                    {actionLabel(record.action)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(record.created_at)}</p>
              </div>

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
                  <span className="text-muted-foreground">· View on map</span>
                </p>
              )}

              {showSelfies && !record.photo_url && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Camera className="h-3 w-3" />
                  No selfie attached
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
