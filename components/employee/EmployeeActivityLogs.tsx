import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeUpdateLogList } from "@/components/shared/EmployeeUpdateLogList";
import type { EmployeeUpdateLog } from "@/lib/types";
import { History } from "lucide-react";

interface EmployeeActivityLogsProps {
  logs: EmployeeUpdateLog[];
}

export function EmployeeActivityLogs({ logs }: EmployeeActivityLogsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Update History
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Log of your profile, deployment status, and location updates.
        </p>
      </CardHeader>
      <CardContent>
        <EmployeeUpdateLogList
          logs={logs}
          emptyMessage="Your profile update history will appear here after you save changes."
        />
      </CardContent>
    </Card>
  );
}
