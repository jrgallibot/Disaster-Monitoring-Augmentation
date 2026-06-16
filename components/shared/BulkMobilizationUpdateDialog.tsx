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
import { bulkUpdateEmployeeMobilization } from "@/lib/actions/mobilization";
import { getMobilizationStatusLabel } from "@/lib/mobilization";
import { getTodayInputValue } from "@/lib/report/date-bounds";
import { toast } from "@/lib/toast";
import { getFullName } from "@/lib/utils";
import type { EmployeeWithRelations, MobilizationStatus } from "@/lib/types";
import { UserCheck, X } from "lucide-react";

interface BulkMobilizationUpdateDialogProps {
  employees: EmployeeWithRelations[];
  onClose: () => void;
  onUpdated: (input: {
    status: MobilizationStatus;
    mobilizedAt: string;
    demobilizedAt: string | null;
    employeeIds: string[];
  }) => void;
}

export function BulkMobilizationUpdateDialog({
  employees,
  onClose,
  onUpdated,
}: BulkMobilizationUpdateDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<MobilizationStatus>("mobilized");
  const [mobilizedAt, setMobilizedAt] = useState(getTodayInputValue());
  const [demobilizedAt, setDemobilizedAt] = useState(getTodayInputValue());

  useEffect(() => {
    if (employees.length === 0) return;
    setStatus("mobilized");
    setMobilizedAt(getTodayInputValue());
    setDemobilizedAt(getTodayInputValue());
    setError(null);
  }, [employees]);

  if (employees.length === 0) return null;

  function handleSave() {
    startTransition(async () => {
      setError(null);
      const employeeIds = employees.map((employee) => employee.id);
      const result = await bulkUpdateEmployeeMobilization(employeeIds, {
        status,
        mobilizedAt,
        demobilizedAt: status === "demobilized" ? demobilizedAt : null,
      });

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      const count = result.sharedCount ?? employees.length;
      toast.success(`Updated augmentation status for ${count} employee${count === 1 ? "" : "s"}.`);

      onUpdated({
        status,
        mobilizedAt,
        demobilizedAt: status === "demobilized" ? demobilizedAt : null,
        employeeIds,
      });

      router.refresh();
      onClose();
    });
  }

  const previewNames = employees.slice(0, 5);
  const remainingCount = Math.max(employees.length - previewNames.length, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-dswd-border">
          <div>
            <h2 className="text-lg font-bold text-dswd-navy flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Bulk Update Augmentation
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Apply the same mobilization status and dates to {employees.length} selected
              employee{employees.length === 1 ? "" : "s"}.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="rounded-lg bg-dswd-light p-3 space-y-1">
            <p className="text-xs font-medium text-dswd-navy uppercase tracking-wide">
              Selected Employees
            </p>
            <ul className="text-sm text-muted-foreground list-disc pl-5">
              {previewNames.map((employee) => (
                <li key={employee.id}>
                  {getFullName(employee.first_name, employee.last_name, employee.middle_name)}
                </li>
              ))}
            </ul>
            {remainingCount > 0 && (
              <p className="text-xs text-muted-foreground">and {remainingCount} more...</p>
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
            <Label htmlFor="bulk_mobilized_at">Mobilized Date *</Label>
            <Input
              id="bulk_mobilized_at"
              type="date"
              value={mobilizedAt}
              onChange={(event) => setMobilizedAt(event.target.value)}
            />
          </div>

          {status === "demobilized" && (
            <div className="space-y-2">
              <Label htmlFor="bulk_demobilized_at">Demobilized Date *</Label>
              <Input
                id="bulk_demobilized_at"
                type="date"
                value={demobilizedAt}
                min={mobilizedAt || undefined}
                onChange={(event) => setDemobilizedAt(event.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : `Update ${employees.length} Selected`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
