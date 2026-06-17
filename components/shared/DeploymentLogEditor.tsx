"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMyDeploymentLogs, updateMyDeploymentLog } from "@/lib/actions/employee-portal";
import {
  getStatusById,
  statusRequiresDeploymentLocation,
  statusRequiresDeploymentRemarks,
} from "@/lib/deployment";
import { toast } from "@/lib/toast";
import type { EmployeeDeploymentLog, LibraryStatus } from "@/lib/types";
import { Briefcase, ClipboardList, MapPin, MessageSquare } from "lucide-react";

interface DeploymentLogEditorProps {
  log: EmployeeDeploymentLog;
  statuses: LibraryStatus[];
  onSaved?: (logs: EmployeeDeploymentLog[]) => void;
}

export function DeploymentLogEditor({ log, statuses, onSaved }: DeploymentLogEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const [statusId, setStatusId] = useState(log.status_id ?? "");
  const [actualTask, setActualTask] = useState(log.actual_task ?? "");
  const [deploymentLocation, setDeploymentLocation] = useState(log.deployment_location ?? "");
  const [deploymentRemarks, setDeploymentRemarks] = useState(log.deployment_remarks ?? "");

  useEffect(() => {
    setStatusId(log.status_id ?? "");
    setActualTask(log.actual_task ?? "");
    setDeploymentLocation(log.deployment_location ?? "");
    setDeploymentRemarks(log.deployment_remarks ?? "");
    setExpanded(false);
    setError(null);
  }, [
    log.id,
    log.status_id,
    log.actual_task,
    log.deployment_location,
    log.deployment_remarks,
  ]);

  const selectedStatus = useMemo(
    () => getStatusById(statusId, statuses),
    [statusId, statuses]
  );

  const locationRequired = statusRequiresDeploymentLocation(selectedStatus?.name);
  const remarksRequired = statusRequiresDeploymentRemarks(selectedStatus?.name);

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
      try {
        setError(null);
        const result = await updateMyDeploymentLog(
          log.id,
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

        const refreshedLogs = await getMyDeploymentLogs();
        onSaved?.(refreshedLogs);
        toast.success("Deployment record updated.");
        setExpanded(false);
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update deployment record.";
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <div className="space-y-3">
      {!expanded ? (
        <div className="space-y-2">
          {log.actual_task ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Actual Task:</span> {log.actual_task}
            </p>
          ) : null}
          {log.deployment_location ? (
            <p className="text-sm text-muted-foreground flex items-start gap-1">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{log.deployment_location}</span>
            </p>
          ) : statusRequiresDeploymentLocation(log.status_name) ? (
            <p className="text-xs text-muted-foreground">No deployment location recorded</p>
          ) : null}
          {log.deployment_remarks ? (
            <p className="text-sm text-muted-foreground flex items-start gap-1">
              <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <span className="font-medium text-foreground">Remarks:</span> {log.deployment_remarks}
              </span>
            </p>
          ) : statusRequiresDeploymentRemarks(log.status_name) ? (
            <p className="text-xs text-muted-foreground">No remarks recorded</p>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(true)}>
            Edit Record
          </Button>
        </div>
      ) : (
        <div className="space-y-4 pt-1 border-t border-dswd-border">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Briefcase className="h-4 w-4" />
              Deployment Status *
            </Label>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {locationRequired && (
            <>
              <div className="space-y-2">
                <Label htmlFor={`history_actual_task_${log.id}`} className="flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4" />
                  Actual Task *
                </Label>
                <Textarea
                  id={`history_actual_task_${log.id}`}
                  value={actualTask}
                  onChange={(e) => setActualTask(e.target.value)}
                  placeholder="Describe your actual duty for this deployment"
                  rows={3}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor={`history_deployment_location_${log.id}`}
                  className="flex items-center gap-1.5"
                >
                  <MapPin className="h-4 w-4" />
                  Deployment Location *
                </Label>
                <Input
                  id={`history_deployment_location_${log.id}`}
                  value={deploymentLocation}
                  onChange={(e) => setDeploymentLocation(e.target.value)}
                  placeholder="Where you were deployed"
                  disabled={isPending}
                />
              </div>
            </>
          )}

          {remarksRequired && (
            <div className="space-y-2">
              <Label
                htmlFor={`history_deployment_remarks_${log.id}`}
                className="flex items-center gap-1.5"
              >
                <MessageSquare className="h-4 w-4" />
                Remarks / Reason *
              </Label>
              <Textarea
                id={`history_deployment_remarks_${log.id}`}
                value={deploymentRemarks}
                onChange={(e) => setDeploymentRemarks(e.target.value)}
                placeholder="Explain why you were on standby, leave, or unavailable"
                rows={3}
                disabled={isPending}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setExpanded(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
