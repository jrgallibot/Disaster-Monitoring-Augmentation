"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MobilizationStatusBadge } from "@/components/shared/MobilizationStatusBadge";
import { updateEmployeeMobilization } from "@/lib/actions/mobilization";
import {
  formatMobilizationDate,
  getMobilizationStatusLabel,
} from "@/lib/mobilization";
import { getTodayInputValue } from "@/lib/report/date-bounds";
import { toast } from "@/lib/toast";
import { getFullName } from "@/lib/utils";
import type { EmployeeWithRelations, MobilizationStatus } from "@/lib/types";
import { CalendarDays, UserCheck, X } from "lucide-react";

interface MobilizationUpdateDialogProps {
  employee: EmployeeWithRelations | null;
  onClose: () => void;
  onUpdated: (employee: EmployeeWithRelations) => void;
}

export function MobilizationUpdateDialog({
  employee,
  onClose,
  onUpdated,
}: MobilizationUpdateDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<MobilizationStatus>("mobilized");
  const [mobilizedAt, setMobilizedAt] = useState("");
  const [demobilizedAt, setDemobilizedAt] = useState("");

  useEffect(() => {
    if (!employee) return;
    setStatus(employee.mobilization_status ?? "mobilized");
    setMobilizedAt(employee.mobilized_at ?? getTodayInputValue());
    setDemobilizedAt(employee.demobilized_at ?? "");
    setError(null);
  }, [employee]);

  if (!employee) return null;

  function handleSave() {
    startTransition(async () => {
      setError(null);
      const result = await updateEmployeeMobilization(employee!.id, {
        status,
        mobilizedAt,
        demobilizedAt: status === "demobilized" ? demobilizedAt : null,
      });

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      onUpdated({
        ...employee!,
        mobilization_status: status,
        mobilized_at: mobilizedAt,
        demobilized_at: status === "demobilized" ? demobilizedAt : null,
        mobilization_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      toast.success("Augmentation status updated successfully.");
      router.refresh();
      onClose();
    });
  }

  const employeeName = getFullName(
    employee.first_name,
    employee.last_name,
    employee.middle_name
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-dswd-border">
          <div>
            <h2 className="text-lg font-bold text-dswd-navy flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Update Augmentation Status
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{employeeName}</p>
            <p className="text-xs font-mono text-muted-foreground">{employee.employee_id}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Separate from daily deployment status
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg bg-dswd-light p-3 space-y-2">
            <p className="text-xs font-medium text-dswd-navy uppercase tracking-wide">
              Current Augmentation
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <MobilizationStatusBadge status={employee.mobilization_status ?? "mobilized"} />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <CalendarDays className="h-4 w-4 shrink-0" />
              Mobilized: {formatMobilizationDate(employee.mobilized_at)}
            </p>
            {employee.demobilized_at && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-4 w-4 shrink-0" />
                Demobilized: {formatMobilizationDate(employee.demobilized_at)}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Augmentation Status *</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as MobilizationStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mobilized">{getMobilizationStatusLabel("mobilized")}</SelectItem>
                <SelectItem value="demobilized">
                  {getMobilizationStatusLabel("demobilized")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobilized_at">Mobilized Date *</Label>
            <Input
              id="mobilized_at"
              type="date"
              value={mobilizedAt}
              onChange={(event) => setMobilizedAt(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Date the employee started augmentation duty.
            </p>
          </div>

          {status === "demobilized" && (
            <div className="space-y-2">
              <Label htmlFor="demobilized_at">Demobilized Date *</Label>
              <Input
                id="demobilized_at"
                type="date"
                value={demobilizedAt}
                min={mobilizedAt || undefined}
                onChange={(event) => setDemobilizedAt(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Date the employee ended augmentation duty.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
