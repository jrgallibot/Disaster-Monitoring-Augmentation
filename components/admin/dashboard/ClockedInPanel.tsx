"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { AdminDashboardData } from "@/lib/types";
import { UserCheck } from "lucide-react";

interface ClockedInPanelProps {
  employees: AdminDashboardData["clockedInEmployees"];
}

export function ClockedInPanel({ employees }: ClockedInPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-green-600" />
          Currently Timed In ({employees.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <p className="text-sm text-muted-foreground">No employees are currently timed in.</p>
        ) : (
          <div className="space-y-3 max-h-[320px] overflow-y-auto">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-3 border border-green-100 bg-green-50/50 rounded-lg"
              >
                <div>
                  <Link
                    href={`/admin/employees/${emp.id}/edit`}
                    className="font-medium text-dswd-blue hover:underline text-sm"
                  >
                    {emp.name}
                  </Link>
                  <p className="text-xs text-muted-foreground font-mono">{emp.employee_id}</p>
                  {emp.deployment_location && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                      {emp.deployment_location}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <Badge className="bg-green-600">On Duty</Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(emp.lastTimeIn)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
