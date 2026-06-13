"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getStatusById, statusRequiresDeploymentLocation } from "@/lib/deployment";
import { getFullName } from "@/lib/utils";
import type { EmployeeWithRelations, LibraryStatus } from "@/lib/types";
import { updateEmployeeDeployment } from "@/lib/actions/employees";
import { Briefcase, MapPin, X } from "lucide-react";

interface AdminDeploymentUpdateDialogProps {
  employee: EmployeeWithRelations | null;
  statuses: LibraryStatus[];
  onClose: () => void;
  onUpdated: (employee: EmployeeWithRelations) => void;
}

export function AdminDeploymentUpdateDialog({
  employee,
  statuses,
  onClose,
  onUpdated,
}: AdminDeploymentUpdateDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [statusId, setStatusId] = useState("");
  const [deploymentLocation, setDeploymentLocation] = useState("");

  useEffect(() => {
    if (!employee) return;
    setStatusId(employee.status_id ?? "");
    setDeploymentLocation(employee.deployment_location ?? "");
    setError(null);
  }, [employee]);

  const selectedStatus = useMemo(
    () => getStatusById(statusId, statuses),
    [statusId, statuses]
  );

  const locationRequired = statusRequiresDeploymentLocation(selectedStatus?.name);

  if (!employee) return null;

  function handleSave() {
    if (!statusId) {
      setError("Please select a deployment status.");
      return;
    }
    if (locationRequired && !deploymentLocation.trim()) {
      setError("Deployment location is required when status is Deployed.");
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await updateEmployeeDeployment(
        employee!.id,
        statusId,
        locationRequired ? deploymentLocation.trim() : undefined
      );

      if (!result.success) {
        setError(result.error);
        return;
      }

      const status = statuses.find((s) => s.id === statusId) ?? null;
      const nextLocation = locationRequired ? deploymentLocation.trim() : null;

      onUpdated({
        ...employee!,
        status_id: statusId,
        status,
        deployment_location: nextLocation,
        updated_at: new Date().toISOString(),
      });

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
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-dswd-border">
          <div>
            <h2 className="text-lg font-bold text-dswd-navy flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Update Deployment
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{employeeName}</p>
            <p className="text-xs font-mono text-muted-foreground">{employee.employee_id}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg bg-dswd-light p-3 space-y-2">
            <p className="text-xs font-medium text-dswd-navy uppercase tracking-wide">
              Current Assignment
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {employee.status ? (
                <Badge color={employee.status.color}>{employee.status.name}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">No status set</span>
              )}
            </div>
            {employee.deployment_location && (
              <p className="text-sm text-muted-foreground flex items-start gap-1">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                {employee.deployment_location}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Deployment Status *</Label>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {locationRequired && (
            <div className="space-y-2">
              <Label htmlFor="deployment_location">Deployment Location *</Label>
              <Input
                id="deployment_location"
                value={deploymentLocation}
                onChange={(e) => setDeploymentLocation(e.target.value)}
                placeholder="e.g. Tacloban Response Center"
                required
              />
              <p className="text-xs text-muted-foreground">
                Required only when status is Deployed.
              </p>
            </div>
          )}

          {!locationRequired && statusId && (
            <p className="text-xs text-muted-foreground">
              Deployment location is not required for {selectedStatus?.name ?? "this status"}.
            </p>
          )}
        </div>

        <div className="p-5 border-t border-dswd-border flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Deployment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
