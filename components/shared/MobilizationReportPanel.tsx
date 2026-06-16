"use client";

import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobilizationReportFiltersBar } from "@/components/shared/MobilizationReportFiltersBar";
import { MobilizationStatusBadge } from "@/components/shared/MobilizationStatusBadge";
import { SexBreakdown } from "@/components/shared/SexBreakdown";
import { SYSTEM_NAME, CREATED_BY } from "@/lib/branding";
import { formatMobilizationDate } from "@/lib/mobilization";
import {
  downloadMobilizationReportExcel,
  printMobilizationReport,
} from "@/lib/report-export";
import { formatDate, getEmployeeTeamLeader, getFullName } from "@/lib/utils";
import { formatSexLabel } from "@/lib/sex-stats";
import type {
  DailyReportFilterOptions,
  MobilizationReportData,
  MobilizationReportFilters,
  SexCount,
} from "@/lib/types";
import { Download, Printer, RefreshCw } from "lucide-react";

interface MobilizationReportPanelProps {
  initialData: MobilizationReportData;
  filterOptions?: DailyReportFilterOptions;
  showFilters?: boolean;
  showTeamFilter?: boolean;
  title?: string;
  onRefresh?: (filters?: MobilizationReportFilters) => Promise<MobilizationReportData>;
}

export function MobilizationReportPanel({
  initialData,
  filterOptions,
  showFilters = false,
  showTeamFilter = false,
  title = "Mobilization Report",
  onRefresh,
}: MobilizationReportPanelProps) {
  const [data, setData] = useState(initialData);
  const [isRefreshing, startRefresh] = useTransition();

  const loadReport = useCallback(
    (filters?: MobilizationReportFilters) => {
      startRefresh(async () => {
        try {
          if (!onRefresh) return;
          const next = await onRefresh(filters ?? data.appliedFilters);
          setData(next);
        } catch {
          // keep existing data on refresh failure
        }
      });
    },
    [data.appliedFilters, onRefresh]
  );

  const refresh = useCallback(() => {
    loadReport(data.appliedFilters);
  }, [data.appliedFilters, loadReport]);

  const summaryItems: { label: string; value: number; sex: SexCount }[] = [
    { label: "In Date Range", value: data.summary.totalInRange, sex: data.summary.sex.totalInRange },
    { label: "Mobilized Now", value: data.summary.mobilizedNow, sex: data.summary.sex.mobilizedNow },
    {
      label: "Demobilized Now",
      value: data.summary.demobilizedNow,
      sex: data.summary.sex.demobilizedNow,
    },
  ];

  return (
    <div className="space-y-4 mobilization-report" id="mobilization-report">
      <div className="hidden print:block mb-6 border-b-2 border-dswd-gold pb-4">
        <h1 className="text-2xl font-bold text-dswd-navy">{SYSTEM_NAME}</h1>
        <h2 className="text-lg font-semibold text-dswd-navy mt-1">{title}</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Period: {formatMobilizationDate(data.dateFrom)} — {formatMobilizationDate(data.dateTo)}
        </p>
        <p className="text-sm text-muted-foreground">Scope: {data.scopeLabel}</p>
        <p className="text-sm text-muted-foreground">Generated: {formatDate(data.generatedAt)}</p>
        <p className="text-xs text-muted-foreground mt-1">Developed by {CREATED_BY}</p>
      </div>

      {showFilters && filterOptions && onRefresh && (
        <MobilizationReportFiltersBar
          filterOptions={filterOptions}
          appliedFilters={data.appliedFilters}
          showTeamFilter={showTeamFilter}
          isPending={isRefreshing}
          onApply={loadReport}
        />
      )}

      <div className="flex flex-wrap gap-2 print:hidden">
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => downloadMobilizationReportExcel(data)}>
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
        <Button variant="outline" size="sm" onClick={printMobilizationReport}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 print:hidden">
        {summaryItems.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-dswd-navy">{item.value}</p>
              <SexBreakdown count={item.sex} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Personnel ({data.rows.length}) — {data.scopeLabel}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {formatMobilizationDate(data.dateFrom)} to {formatMobilizationDate(data.dateTo)}
          </p>
        </CardHeader>
        <CardContent>
          {data.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No personnel found for the selected filters and date range.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dswd-border bg-dswd-light">
                    <th className="text-left p-3 font-semibold text-dswd-navy">No.</th>
                    <th className="text-left p-3 font-semibold text-dswd-navy">Employee ID</th>
                    <th className="text-left p-3 font-semibold text-dswd-navy">Name</th>
                    <th className="text-left p-3 font-semibold text-dswd-navy">Sex</th>
                    <th className="text-left p-3 font-semibold text-dswd-navy">Region</th>
                    <th className="text-left p-3 font-semibold text-dswd-navy">Specialization</th>
                    <th className="text-left p-3 font-semibold text-dswd-navy">Team Leader</th>
                    <th className="text-left p-3 font-semibold text-dswd-navy">Status</th>
                    <th className="text-left p-3 font-semibold text-dswd-navy">Mobilized</th>
                    <th className="text-left p-3 font-semibold text-dswd-navy">Demobilized</th>
                    <th className="text-left p-3 font-semibold text-dswd-navy">Duration (days)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, index) => {
                    const employee = row.employee;
                    return (
                      <tr key={employee.id} className="border-b border-dswd-border">
                        <td className="p-3">{index + 1}</td>
                        <td className="p-3 font-mono text-xs">{employee.employee_id}</td>
                        <td className="p-3">
                          {getFullName(employee.first_name, employee.last_name, employee.middle_name)}
                        </td>
                        <td className="p-3">{formatSexLabel(employee.sex)}</td>
                        <td className="p-3">{employee.region?.code ?? "—"}</td>
                        <td className="p-3">{employee.specialization?.name ?? "—"}</td>
                        <td className="p-3">{getEmployeeTeamLeader(employee) ?? "—"}</td>
                        <td className="p-3">
                          <MobilizationStatusBadge status={employee.mobilization_status ?? "mobilized"} />
                        </td>
                        <td className="p-3">{formatMobilizationDate(employee.mobilized_at)}</td>
                        <td className="p-3">{formatMobilizationDate(employee.demobilized_at)}</td>
                        <td className="p-3">{row.durationDays ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
