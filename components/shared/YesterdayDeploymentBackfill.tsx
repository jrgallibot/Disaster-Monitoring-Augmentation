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
import { saveMyYesterdayDeployment, getMyDeploymentLogs } from "@/lib/actions/employee-portal";
import {
  getStatusById,
  statusRequiresDeploymentLocation,
  statusRequiresDeploymentRemarks,
} from "@/lib/deployment";
import {
  getYesterdayDeploymentLog,
  getYesterdayReportBounds,
} from "@/lib/deployment-yesterday";
import { toast } from "@/lib/toast";
import type { EmployeeDeploymentLog, LibraryStatus } from "@/lib/types";
import { Briefcase, CalendarDays, ClipboardList, MapPin, MessageSquare } from "lucide-react";

interface YesterdayDeploymentBackfillProps {
  logs: EmployeeDeploymentLog[];
  statuses: LibraryStatus[];
  onSaved?: (logs: EmployeeDeploymentLog[]) => void;
}

export function YesterdayDeploymentBackfill({
  logs,
  statuses,
  onSaved,
}: YesterdayDeploymentBackfillProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const yesterdayLog = useMemo(() => getYesterdayDeploymentLog(logs), [logs]);
  const yesterdayLabel = getYesterdayReportBounds().label;

  const [statusId, setStatusId] = useState("");
  const [actualTask, setActualTask] = useState("");
  const [deploymentLocation, setDeploymentLocation] = useState("");
  const [deploymentRemarks, setDeploymentRemarks] = useState("");

  useEffect(() => {
    if (yesterdayLog) {
      setStatusId(yesterdayLog.status_id ?? "");
      setActualTask(yesterdayLog.actual_task ?? "");
      setDeploymentLocation(yesterdayLog.deployment_location ?? "");
      setDeploymentRemarks(yesterdayLog.deployment_remarks ?? "");
      setExpanded(false);
    } else {
      setStatusId("");
      setActualTask("");
      setDeploymentLocation("");
      setDeploymentRemarks("");
      setExpanded(true);
    }
    setError(null);
  }, [yesterdayLog?.id, yesterdayLog?.status_id, yesterdayLog?.actual_task, yesterdayLog?.deployment_location, yesterdayLog?.deployment_remarks]);

  const selectedStatus = useMemo(
    () => getStatusById(statusId, statuses),
    [statusId, statuses]
  );

  const locationRequired = statusRequiresDeploymentLocation(selectedStatus?.name);
  const remarksRequired = statusRequiresDeploymentRemarks(selectedStatus?.name);

  function handleSave() {
    if (!statusId) {
      const message = "Please select yesterday's deployment status.";
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
        const { dateKey } = getYesterdayReportBounds();
        const result = await saveMyYesterdayDeployment(
          statusId,
          dateKey,
          locationRequired ? deploymentLocation.trim() : undefined,
          locationRequired ? actualTask.trim() : undefined,
          remarksRequired ? deploymentRemarks.trim() : undefined,
          yesterdayLog?.id
        );

        if (!result.success) {
          setError(result.error);
          toast.error(result.error);
          return;
        }

        const refreshedLogs = await getMyDeploymentLogs();
        onSaved?.(refreshedLogs);

        toast.success(
          yesterdayLog
            ? "Yesterday's deployment record updated."
            : "Yesterday's deployment recorded successfully."
        );
        setExpanded(false);
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save yesterday's deployment.";
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            Yesterday&apos;s Deployment ({yesterdayLabel})
          </p>
          {!yesterdayLog ? (
            <p className="text-sm text-amber-900">
              You did not record deployment status for yesterday. Add it here if you forgot before
              the midnight reset.
            </p>
          ) : (
            <p className="text-sm text-amber-900">
              Yesterday is already on file. You can still update status, actual task, or location if
              something was missing or wrong.
            </p>
          )}
        </div>
        {yesterdayLog && (
          <div className="flex items-center gap-2 shrink-0">
            <Badge color={statuses.find((s) => s.id === yesterdayLog.status_id)?.color}>
              {yesterdayLog.status_name}
            </Badge>
            {!expanded && (
              <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(true)}>
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      {yesterdayLog && !expanded && (
        <div className="text-sm text-amber-950 space-y-1">
          {yesterdayLog.actual_task && (
            <p>
              <span className="font-medium">Actual Task:</span> {yesterdayLog.actual_task}
            </p>
          )}
          {yesterdayLog.deployment_location && (
            <p className="flex items-start gap-1">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
              {yesterdayLog.deployment_location}
            </p>
          )}
          {yesterdayLog.deployment_remarks && (
            <p className="flex items-start gap-1">
              <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
              {yesterdayLog.deployment_remarks}
            </p>
          )}
        </div>
      )}

      {(expanded || !yesterdayLog) && (
        <div className="space-y-4 pt-1 border-t border-amber-200/80">
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
                <SelectValue placeholder="Select yesterday's status" />
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
                <Label htmlFor="yesterday_actual_task" className="flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4" />
                  Actual Task *
                </Label>
                <Textarea
                  id="yesterday_actual_task"
                  value={actualTask}
                  onChange={(e) => setActualTask(e.target.value)}
                  placeholder="What you actually did yesterday"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yesterday_deployment_location" className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  Deployment Location *
                </Label>
                <Input
                  id="yesterday_deployment_location"
                  value={deploymentLocation}
                  onChange={(e) => setDeploymentLocation(e.target.value)}
                  placeholder="Where you were deployed yesterday"
                />
              </div>
            </>
          )}

          {remarksRequired && (
            <div className="space-y-2">
              <Label htmlFor="yesterday_deployment_remarks" className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Remarks / Reason *
              </Label>
              <Textarea
                id="yesterday_deployment_remarks"
                value={deploymentRemarks}
                onChange={(e) => setDeploymentRemarks(e.target.value)}
                placeholder="Explain why you were on standby, leave, or unavailable"
                rows={3}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSave} disabled={isPending}>
              {isPending
                ? "Saving..."
                : yesterdayLog
                  ? "Save Yesterday's Update"
                  : "Add Yesterday's Deployment"}
            </Button>
            {yesterdayLog && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setExpanded(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
            )}
          </div>

          <p className="text-xs text-amber-800">
            Only yesterday ({yesterdayLabel}) can be backfilled here. This does not change
            today&apos;s deployment assignment.
          </p>
        </div>
      )}
    </div>
  );
}
