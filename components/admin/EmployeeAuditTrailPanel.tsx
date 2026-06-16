"use client";

import { useCallback, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getEmployeeAuditTrail } from "@/lib/actions/audit-trail";
import { formatDate } from "@/lib/utils";
import type { AuditTrailCategory, AuditTrailData, AuditTrailFilters } from "@/lib/types";
import { History, RefreshCw } from "lucide-react";

interface EmployeeAuditTrailPanelProps {
  initialData: AuditTrailData;
  employeeOptions: { id: string; employee_id: string; name: string }[];
}

const categoryLabels: Record<Exclude<AuditTrailCategory, "all">, string> = {
  profile: "Profile",
  deployment: "Deployment",
  mobilization: "Augmentation",
};

const categoryColors: Record<Exclude<AuditTrailCategory, "all">, string> = {
  profile: "#1E40AF",
  deployment: "#059669",
  mobilization: "#7C3AED",
};

export function EmployeeAuditTrailPanel({
  initialData,
  employeeOptions,
}: EmployeeAuditTrailPanelProps) {
  const [data, setData] = useState(initialData);
  const [category, setCategory] = useState<AuditTrailCategory>("all");
  const [employeeId, setEmployeeId] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  const loadTrail = useCallback((filters: AuditTrailFilters) => {
    startTransition(async () => {
      try {
        const next = await getEmployeeAuditTrail(filters);
        setData(next);
      } catch {
        // keep existing data
      }
    });
  }, []);

  function applyFilters(nextCategory = category, nextEmployeeId = employeeId) {
    loadTrail({
      category: nextCategory,
      employeeId: nextEmployeeId === "all" ? null : nextEmployeeId,
      limit: 100,
    });
  }

  return (
    <Card id="employee-audit-trail">
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5" />
              Audit Trail & Activity Logs
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              System-wide history of profile updates, deployment changes, and augmentation
              status updates across all employees.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Last refreshed: {formatDate(data.generatedAt)}
              {isPending && " · Refreshing..."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={category}
              onValueChange={(value) => {
                const next = value as AuditTrailCategory;
                setCategory(next);
                applyFilters(next, employeeId);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="profile">Profile updates</SelectItem>
                <SelectItem value="deployment">Deployment</SelectItem>
                <SelectItem value="mobilization">Augmentation</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={employeeId}
              onValueChange={(value) => {
                setEmployeeId(value);
                applyFilters(category, value);
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {employeeOptions.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name} ({employee.employee_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                applyFilters(
                  category,
                  employeeId
                )
              }
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No audit records found for the selected filters.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-dswd-border">
            <table className="w-full text-sm">
              <thead className="bg-dswd-light">
                <tr className="text-left">
                  <th className="p-3 font-semibold text-dswd-navy w-10">#</th>
                  <th className="p-3 font-semibold text-dswd-navy min-w-[150px]">Date & Time</th>
                  <th className="p-3 font-semibold text-dswd-navy min-w-[180px]">Employee</th>
                  <th className="p-3 font-semibold text-dswd-navy w-[120px]">Category</th>
                  <th className="p-3 font-semibold text-dswd-navy min-w-[220px]">Activity</th>
                  <th className="p-3 font-semibold text-dswd-navy min-w-[160px]">Performed By</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry, index) => (
                  <tr key={entry.id} className="border-t border-dswd-border align-top hover:bg-dswd-light/40">
                    <td className="p-3 text-muted-foreground">{index + 1}</td>
                    <td className="p-3 whitespace-nowrap">{formatDate(entry.created_at)}</td>
                    <td className="p-3">
                      <p className="font-medium text-dswd-navy">{entry.employee_name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{entry.employee_code}</p>
                    </td>
                    <td className="p-3">
                      <Badge color={categoryColors[entry.category]}>
                        {categoryLabels[entry.category]}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-dswd-navy">{entry.title}</p>
                      {entry.details.length > 0 && (
                        <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                          {entry.details.map((detail) => (
                            <li key={detail}>{detail}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{entry.actor_label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Showing {data.totalShown} most recent record{data.totalShown === 1 ? "" : "s"}.
          Open an employee&apos;s History in the table above for full per-person logs including
          accomplishments and attendance.
        </p>
      </CardContent>
    </Card>
  );
}
