import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeDeploymentLogList } from "@/components/shared/EmployeeDeploymentLogList";
import type { EmployeeDeploymentLog, EmployeeWithRelations, LibraryStatus } from "@/lib/types";
import { Briefcase } from "lucide-react";

interface EmployeeDeploymentHistoryProps {
  employee: EmployeeWithRelations;
  logs: EmployeeDeploymentLog[];
  statuses: LibraryStatus[];
  editableActualTask?: boolean;
  onDeploymentLogsSaved?: (logs: EmployeeDeploymentLog[]) => void;
}

export function EmployeeDeploymentHistory({
  employee,
  logs,
  statuses,
  editableActualTask = false,
  onDeploymentLogsSaved,
}: EmployeeDeploymentHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Briefcase className="h-5 w-5" />
          Deployment History
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Past deployment status updates are kept here even after the daily midnight reset. Use the
          yesterday backfill section for yesterday, or click Edit Record on any older entry to
          update status, actual task, location, and remarks.
        </p>
      </CardHeader>
      <CardContent>
        <EmployeeDeploymentLogList
          employee={employee}
          logs={logs}
          statuses={statuses}
          editableActualTask={editableActualTask}
          onDeploymentLogsSaved={onDeploymentLogsSaved}
          emptyMessage="Your deployment updates will appear here after you set your status."
        />
      </CardContent>
    </Card>
  );
}
