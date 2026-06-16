"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateDeploymentLogActualTask } from "@/lib/actions/employee-portal";
import { toast } from "@/lib/toast";
import type { EmployeeDeploymentLog } from "@/lib/types";
import { ClipboardList } from "lucide-react";

interface DeploymentLogActualTaskEditorProps {
  log: EmployeeDeploymentLog;
  onUpdated?: (log: EmployeeDeploymentLog) => void;
}

export function DeploymentLogActualTaskEditor({
  log,
  onUpdated,
}: DeploymentLogActualTaskEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actualTask, setActualTask] = useState(log.actual_task ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActualTask(log.actual_task ?? "");
    setError(null);
  }, [log.id, log.actual_task]);

  function handleSave() {
    if (!actualTask.trim()) {
      const message = "Actual task is required.";
      setError(message);
      toast.error(message);
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await updateDeploymentLogActualTask(log.id, actualTask.trim());

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      onUpdated?.({ ...log, actual_task: actualTask.trim() });
      toast.success("Actual task updated.");
      router.refresh();
    });
  }

  const unchanged = actualTask.trim() === (log.actual_task ?? "").trim();

  return (
    <div className="space-y-2">
      <Label htmlFor={`actual_task_log_${log.id}`} className="flex items-center gap-1.5 text-sm">
        <ClipboardList className="h-4 w-4 shrink-0" />
        Actual Task
      </Label>
      <Textarea
        id={`actual_task_log_${log.id}`}
        value={actualTask}
        onChange={(event) => setActualTask(event.target.value)}
        placeholder="Describe your actual duty for this deployment"
        rows={2}
        disabled={isPending}
        className="text-sm"
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button type="button" size="sm" variant="outline" onClick={handleSave} disabled={isPending || unchanged}>
        {isPending ? "Saving..." : "Save Actual Task"}
      </Button>
    </div>
  );
}
