"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getStatusById, statusRequiresDeploymentLocation, statusRequiresDeploymentRemarks } from "@/lib/deployment";
import { DEPLOYMENT_DAILY_RESET_NOTICE } from "@/lib/deployment-daily";
import { getFullName } from "@/lib/utils";
import type { EmployeeWithRelations, LibraryStatus } from "@/lib/types";
import { updateEmployeeDeployment } from "@/lib/actions/employees";
import { toast } from "@/lib/toast";
import { Briefcase, ClipboardList, MapPin, MessageSquare, X } from "lucide-react";

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
  const [actualTask, setActualTask] = useState("");
  const [deploymentLocation, setDeploymentLocation] = useState("");
  const [deploymentRemarks, setDeploymentRemarks] = useState("");

  useEffect(() => {
    if (!employee) return;
    const pending = employee.deploymentPending ?? false;
    setStatusId(pending ? "" : (employee.status_id ?? ""));
    setActualTask(pending ? "" : (employee.actual_task ?? ""));
    setDeploymentLocation(pending ? "" : (employee.deployment_location ?? ""));
    setDeploymentRemarks(pending ? "" : (employee.deployment_remarks ?? ""));
    setError(null);
  }, [employee]);

  const selectedStatus = useMemo(
    () => getStatusById(statusId, statuses),
    [statusId, statuses]
  );

  if (!employee) return null;

  const locationRequired = statusRequiresDeploymentLocation(selectedStatus?.name);
  const remarksRequired = statusRequiresDeploymentRemarks(selectedStatus?.name);
  const deploymentPending = employee.deploymentPending ?? false;

  function handleSave() {
    if (!statusId) {
      const message = "Please select a deployment status.";
      setError(message);
      toast.error(message);
      return;
    }
    if (locationRequired && !actualTask.trim()) {
      const message = "Actual task is required when status is Deployed.";
      setError(message);
      toast.error(message);
      return;
    }
    if (locationRequired && !deploymentLocation.trim()) {
      const message = "Deployment location is required when status is Deployed.";
      setError(message);
      toast.error(message);
      return;
    }
    if (remarksRequired && !deploymentRemarks.trim()) {
      const message = `Remarks are required when status is ${selectedStatus?.name}. Explain why.`;
      setError(message);
      toast.error(message);
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await updateEmployeeDeployment(
        employee!.id,
        statusId,
        locationRequired ? deploymentLocation.trim() : undefined,
        locationRequired ? actualTask.trim() : undefined,
        remarksRequired ? deploymentRemarks.trim() : undefined
      );

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      const status = statuses.find((s) => s.id === statusId) ?? null;
      const nextLocation = locationRequired ? deploymentLocation.trim() : null;
      const nextActualTask = locationRequired ? actualTask.trim() : null;
      const nextRemarks = remarksRequired ? deploymentRemarks.trim() : null;

      onUpdated({
        ...employee!,
        status_id: statusId,
        status,
        actual_task: nextActualTask,
        deployment_location: nextLocation,
        deployment_remarks: nextRemarks,
        deployment_set_at: new Date().toISOString(),
        deploymentPending: false,
        updated_at: new Date().toISOString(),
      });

      toast.success("Deployment updated successfully.");
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
              <Briefcase className="h-5 w-5" />
              {deploymentPending ? "Set Today's Deployment" : "Update Deployment"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{employeeName}</p>
            <p className="text-xs font-mono text-muted-foreground">{employee.employee_id}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Specialization: {employee.specialization?.name ?? "—"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4">
          {deploymentPending && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {DEPLOYMENT_DAILY_RESET_NOTICE}
            </div>
          )}

          <div className="rounded-lg bg-dswd-light p-3 space-y-2">
            <p className="text-xs font-medium text-dswd-navy uppercase tracking-wide">
              {deploymentPending ? "Today's Assignment" : "Current Assignment"}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {employee.status ? (
                <Badge color={employee.status.color}>{employee.status.name}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {deploymentPending ? "Not set for today" : "No status set"}
                </span>
              )}
            </div>
            {employee.actual_task && (
              <p className="text-sm text-muted-foreground flex items-start gap-1">
                <ClipboardList className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium text-foreground">Actual Task:</span>{" "}
                  {employee.actual_task}
                </span>
              </p>
            )}
            {employee.deployment_location && (
              <p className="text-sm text-muted-foreground flex items-start gap-1">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium text-foreground">Deployment Location:</span>{" "}
                  {employee.deployment_location}
                </span>
              </p>
            )}
            {employee.deployment_remarks && (
              <p className="text-sm text-muted-foreground flex items-start gap-1">
                <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium text-foreground">Remarks:</span>{" "}
                  {employee.deployment_remarks}
                </span>
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
            <>
              <div className="space-y-2">
                <Label htmlFor="actual_task">Actual Task *</Label>
                <Textarea
                  id="actual_task"
                  value={actualTask}
                  onChange={(e) => setActualTask(e.target.value)}
                  placeholder="e.g. Conduct rapid damage assessment and relief distribution"
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deployment_location">Deployment Location *</Label>
                <Input
                  id="deployment_location"
                  value={deploymentLocation}
                  onChange={(e) => setDeploymentLocation(e.target.value)}
                  placeholder="e.g. Tacloban Response Center"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Actual task and deployment location are required when status is Deployed.
              </p>
            </>
          )}

          {remarksRequired && (
            <div className="space-y-2">
              <Label htmlFor="deployment_remarks">Remarks / Reason *</Label>
              <Textarea
                id="deployment_remarks"
                value={deploymentRemarks}
                onChange={(e) => setDeploymentRemarks(e.target.value)}
                placeholder="e.g. On medical leave, awaiting reassignment, personal emergency..."
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground">
                Required for {selectedStatus?.name}. Team leaders and admins will see this reason.
              </p>
            </div>
          )}

          {!locationRequired && !remarksRequired && statusId && (
            <p className="text-xs text-muted-foreground">
              No additional fields required for {selectedStatus?.name ?? "this status"}.
            </p>
          )}
        </div>

        <div className="p-5 border-t border-dswd-border flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : deploymentPending ? "Save Today's Deployment" : "Save Deployment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
