"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeAvatar } from "@/components/shared/EmployeeAvatar";
import { EmployeeAttendanceList } from "@/components/shared/EmployeeAttendanceList";
import { EmployeeUpdateLogList } from "@/components/shared/EmployeeUpdateLogList";
import { getAttendanceForAdmin } from "@/lib/actions/attendance";
import { getEmployeeUpdateLogsForAdmin } from "@/lib/actions/employees";
import { formatCoordinates, getMapUrl, hasValidCoordinates } from "@/lib/geo";
import { getFullName } from "@/lib/utils";
import type { EmployeeAttendance, EmployeeUpdateLog, EmployeeWithRelations } from "@/lib/types";
import { Clock, History, MapPin, X } from "lucide-react";

interface AdminEmployeeHistoryDialogProps {
  employee: EmployeeWithRelations | null;
  onClose: () => void;
}

export function AdminEmployeeHistoryDialog({
  employee,
  onClose,
}: AdminEmployeeHistoryDialogProps) {
  const [logs, setLogs] = useState<EmployeeUpdateLog[]>([]);
  const [attendance, setAttendance] = useState<EmployeeAttendance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState("updates");

  useEffect(() => {
    if (!employee) {
      setLogs([]);
      setAttendance([]);
      setError(null);
      return;
    }

    startTransition(async () => {
      setError(null);
      try {
        const [logsResult, attendanceResult] = await Promise.all([
          getEmployeeUpdateLogsForAdmin(employee.id),
          getAttendanceForAdmin(employee.id),
        ]);

        let err: string | null = null;

        if (!logsResult || !logsResult.success) {
          err = logsResult?.error ?? "Failed to load update history.";
          setLogs([]);
        } else {
          setLogs(logsResult.logs);
        }

        if (!attendanceResult || !attendanceResult.success) {
          if (!err) {
            err = attendanceResult?.error ?? "Failed to load attendance records.";
          }
          setAttendance([]);
        } else {
          setAttendance(attendanceResult.records);
        }

        setError(err);
      } catch {
        setError("Failed to load employee records. Please refresh and try again.");
        setLogs([]);
        setAttendance([]);
      }
    });
  }, [employee?.id]);

  if (!employee) return null;

  const employeeName = getFullName(
    employee.first_name,
    employee.last_name,
    employee.middle_name
  );

  const isClockedIn = attendance[0]?.action === "time_in";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-dswd-border">
          <div className="flex items-center gap-4 min-w-0">
            <EmployeeAvatar photoUrl={employee.photo_url} size={56} />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-dswd-navy truncate">{employeeName}</h2>
              <p className="text-sm font-mono text-muted-foreground">{employee.employee_id}</p>
              {isClockedIn && (
                <p className="text-xs text-green-700 font-semibold mt-1">Currently Timed In</p>
              )}
              {hasValidCoordinates(employee.last_latitude, employee.last_longitude) && (
                <a
                  href={getMapUrl(employee.last_latitude, employee.last_longitude)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-dswd-blue hover:underline flex items-center gap-1 mt-1"
                >
                  <MapPin className="h-3 w-3" />
                  Last location: {formatCoordinates(employee.last_latitude, employee.last_longitude)}
                </a>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="updates" className="gap-2">
                <History className="h-4 w-4" />
                Profile Updates
              </TabsTrigger>
              <TabsTrigger value="attendance" className="gap-2">
                <Clock className="h-4 w-4" />
                Time In / Out
              </TabsTrigger>
            </TabsList>

            {isPending && (
              <p className="text-sm text-muted-foreground mb-4">Loading records...</p>
            )}
            {error && (
              <p className="text-sm text-red-600 mb-4">{error}</p>
            )}

            <TabsContent value="updates">
              {!isPending && (
                <EmployeeUpdateLogList
                  logs={logs}
                  emptyMessage="This employee has no logged profile updates yet."
                />
              )}
            </TabsContent>

            <TabsContent value="attendance">
              {!isPending && (
                <EmployeeAttendanceList
                  records={attendance}
                  emptyMessage="This employee has no time in/out records yet."
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
