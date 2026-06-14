"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeAttendanceList } from "@/components/shared/EmployeeAttendanceList";
import { recordAttendance, uploadAttendanceSelfie } from "@/lib/actions/attendance";
import { toast } from "@/lib/toast";
import { getCurrentPosition } from "@/lib/geo";
import { formatDate } from "@/lib/utils";
import type { AttendanceStatus, EmployeeAttendance } from "@/lib/types";
import { Camera, Clock, LogIn, LogOut, MapPin } from "lucide-react";

interface EmployeeAttendancePanelProps {
  status: AttendanceStatus;
  records: EmployeeAttendance[];
}

export function EmployeeAttendancePanel({ status, records }: EmployeeAttendancePanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"time_in" | "time_out" | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  function resetSelfie() {
    setSelfieFile(null);
    setSelfiePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function requestAttendance(action: "time_in" | "time_out") {
    setError(null);
    resetSelfie();
    setPendingAction(action);
  }

  function cancelConfirmation() {
    setPendingAction(null);
    resetSelfie();
  }

  function handleSelfieChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieFile(file);
    setSelfiePreview(URL.createObjectURL(file));
    setError(null);
  }

  function confirmAttendance() {
    if (!pendingAction) return;

    if (!selfieFile) {
      const message = "Selfie photo is required. Please take or upload a selfie before confirming.";
      setError(message);
      toast.error(message);
      return;
    }

    const action = pendingAction;

    startTransition(async () => {
      const uploadData = new FormData();
      uploadData.set("photo", selfieFile);
      const uploadResult = await uploadAttendanceSelfie(uploadData, action);

      if (!uploadResult.success) {
        setError(uploadResult.error);
        toast.error(uploadResult.error);
        return;
      }

      const position = await getCurrentPosition();
      const result = await recordAttendance(
        action,
        uploadResult.url ?? "",
        position?.latitude,
        position?.longitude
      );

      if (!result || !result.success) {
        const message = result?.error ?? "Failed to record attendance. Please try again.";
        setError(message);
        toast.error(message);
        return;
      }

      setPendingAction(null);
      resetSelfie();
      toast.success(
        action === "time_in"
          ? "Time in recorded successfully."
          : "Time out recorded successfully."
      );
      router.refresh();
    });
  }

  const confirmationMessage =
    pendingAction === "time_in"
      ? "Are you sure you want to Time In? A selfie, duty start, and GPS location will be recorded."
      : pendingAction === "time_out"
        ? "Are you sure you want to Time Out? A selfie, duty end, and GPS location will be recorded."
        : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Time In / Time Out
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Record your duty attendance with a required selfie. GPS location is captured when available.
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
          <div className="p-4 border border-dswd-border rounded-lg bg-amber-50 space-y-4">
            <p className="text-sm font-medium text-dswd-navy">{confirmationMessage}</p>
            <p className="text-xs text-muted-foreground">
              Please confirm only if you are at your deployment location and ready to record attendance.
            </p>

            <div className="space-y-2">
              <Label htmlFor="attendance-selfie">Selfie Photo *</Label>
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="h-28 w-28 rounded-lg overflow-hidden bg-white border border-dswd-border flex items-center justify-center shrink-0">
                  {selfiePreview ? (
                    <Image
                      src={selfiePreview}
                      alt="Selfie preview"
                      width={112}
                      height={112}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    ref={fileInputRef}
                    id="attendance-selfie"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    capture="user"
                    onChange={handleSelfieChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Take a selfie using your front camera or upload a photo. Required for verification.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={confirmAttendance} disabled={isPending || !selfieFile} className="gap-2">
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

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Allow location access for GPS tracking on time in/out.
        </p>

        <div>
          <h3 className="text-sm font-semibold text-dswd-navy mb-3">My Attendance History</h3>
          <EmployeeAttendanceList records={records} showSelfies />
        </div>
      </CardContent>
    </Card>
  );
}
