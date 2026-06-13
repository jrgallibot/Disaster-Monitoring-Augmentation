"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeAttendanceList } from "@/components/shared/EmployeeAttendanceList";
import { recordAttendance } from "@/lib/actions/attendance";
import { getCurrentPosition } from "@/lib/geo";
import { formatDate } from "@/lib/utils";
import type { AttendanceStatus, EmployeeAttendance } from "@/lib/types";
import { Clock, LogIn, LogOut, MapPin } from "lucide-react";

interface EmployeeAttendancePanelProps {
  status: AttendanceStatus;
  records: EmployeeAttendance[];
}

export function EmployeeAttendancePanel({ status, records }: EmployeeAttendancePanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"time_in" | "time_out" | null>(null);

  function requestAttendance(action: "time_in" | "time_out") {
    setError(null);
    setSuccess(null);
    setPendingAction(action);
  }

  function cancelConfirmation() {
    setPendingAction(null);
  }

  function confirmAttendance() {
    if (!pendingAction) return;

    const action = pendingAction;
    setPendingAction(null);

    startTransition(async () => {
      const position = await getCurrentPosition();
      const result = await recordAttendance(
        action,
        position?.latitude,
        position?.longitude
      );

      if (!result || !result.success) {
        setError(result?.error ?? "Failed to record attendance. Please try again.");
        return;
      }

      setSuccess(
        action === "time_in"
          ? "Time in recorded successfully."
          : "Time out recorded successfully."
      );
      router.refresh();
    });
  }

  const confirmationMessage =
    pendingAction === "time_in"
      ? "Are you sure you want to Time In? Your duty start and GPS location will be recorded."
      : pendingAction === "time_out"
        ? "Are you sure you want to Time Out? Your duty end and GPS location will be recorded."
        : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Time In / Time Out
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Record your duty attendance. GPS location is captured when available.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-dswd-light rounded-lg">
          <div>
            <p className="text-sm font-medium text-dswd-navy">Current Status</p>
            <p className="text-sm text-muted-foreground mt-1">
              {status.isClockedIn ? (
                <span className="text-green-700 font-semibold">Timed In (On Duty)</span>
              ) : (
                <span className="text-amber-700 font-semibold">Timed Out (Off Duty)</span>
              )}
            </p>
            {status.lastRecord && (
              <p className="text-xs text-muted-foreground mt-1">
                Last {status.lastRecord.action === "time_in" ? "Time In" : "Time Out"}:{" "}
                {formatDate(status.lastRecord.created_at)}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => requestAttendance("time_in")}
              disabled={isPending || status.isClockedIn || pendingAction !== null}
              className="gap-2"
            >
              <LogIn className="h-4 w-4" />
              Time In
            </Button>
            <Button
              variant="outline"
              onClick={() => requestAttendance("time_out")}
              disabled={isPending || !status.isClockedIn || pendingAction !== null}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Time Out
            </Button>
          </div>
        </div>

        {pendingAction && confirmationMessage && (
          <div className="p-4 border border-dswd-border rounded-lg bg-amber-50 space-y-3">
            <p className="text-sm font-medium text-dswd-navy">{confirmationMessage}</p>
            <p className="text-xs text-muted-foreground">
              Please confirm only if you are at your deployment location and ready to record attendance.
            </p>
            <div className="flex gap-2">
              <Button onClick={confirmAttendance} disabled={isPending} className="gap-2">
                {pendingAction === "time_in" ? (
                  <LogIn className="h-4 w-4" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {isPending ? "Saving..." : "Yes, Confirm"}
              </Button>
              <Button variant="outline" onClick={cancelConfirmation} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
            {success}
          </div>
        )}

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Allow location access for GPS tracking on time in/out.
        </p>

        <div>
          <h3 className="text-sm font-semibold text-dswd-navy mb-3">My Attendance History</h3>
          <EmployeeAttendanceList records={records} />
        </div>
      </CardContent>
    </Card>
  );
}
