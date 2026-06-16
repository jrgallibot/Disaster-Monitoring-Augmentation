import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeDeploymentLogList } from "@/components/shared/EmployeeDeploymentLogList";
import type { EmployeeDeploymentLog, EmployeeWithRelations, LibraryStatus } from "@/lib/types";
import { Briefcase } from "lucide-react";

interface EmployeeDeploymentHistoryProps {
  employee: EmployeeWithRelations;
  logs: EmployeeDeploymentLog[];
  statuses: LibraryStatus[];
  editableActualTask?: boolean;
}

export function EmployeeDeploymentHistory({
  employee,
  logs,
  statuses,
  editableActualTask = false,
}: EmployeeDeploymentHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Briefcase className="h-5 w-5" />
          Deployment History
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Past deployment status updates are kept here even after the daily midnight reset. If you
          forgot yesterday&apos;s status or actual task, use the yesterday backfill section. For older
          Deployed entries, you can edit the actual task only.
        </p>
      </CardHeader>
      <CardContent>
        <EmployeeDeploymentLogList
          employee={employee}
          logs={logs}
          statuses={statuses}
          editableActualTask={editableActualTask}
          emptyMessage="Your deployment updates will appear here after you set your status."
        />
      </CardContent>
    </Card>
  );
}
