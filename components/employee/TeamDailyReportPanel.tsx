"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyReportFiltersBar } from "@/components/shared/DailyReportFiltersBar";
import { OperationsReportMembersTable } from "@/components/shared/OperationsReportMembersTable";
import { SexBreakdown } from "@/components/shared/SexBreakdown";
import { ReportPrintHeader } from "@/components/brand/ReportPrintHeader";
import { getTeamDailyReportData } from "@/lib/actions/team-leader";
import { CREATED_BY } from "@/lib/branding";
import {
  downloadTeamDailyReportExcel,
  printTeamDailyReport,
} from "@/lib/report-export";
import { formatDate, getFullName } from "@/lib/utils";
import type { DailyReportFilterOptions, DailyReportFilters, SexCount, TeamDailyReportData } from "@/lib/types";
import { Download, FileText, Printer, RefreshCw } from "lucide-react";

interface TeamDailyReportPanelProps {
  initialData: TeamDailyReportData;
  allLedRegions: TeamDailyReportData["ledRegions"];
}

export function TeamDailyReportPanel({ initialData, allLedRegions }: TeamDailyReportPanelProps) {
  const [data, setData] = useState(initialData);
  const [isRefreshing, startRefresh] = useTransition();

  const filterOptions = useMemo<DailyReportFilterOptions>(
    () => ({
      regions: allLedRegions.map((region) => ({
        id: region.id,
        name: region.name,
        code: region.code,
      })),
      teams: [],
    }),
    [allLedRegions]
  );

  const loadReport = useCallback((filters?: DailyReportFilters) => {
    startRefresh(async () => {
      try {
        const next = await getTeamDailyReportData(filters ?? data.appliedFilters);
        if (next) setData(next);
      } catch {
        // keep existing data on refresh failure
      }
    });
  }, [data.appliedFilters]);

  const refresh = useCallback(() => {
    loadReport(data.appliedFilters);
  }, [data.appliedFilters, loadReport]);

  const regionLabel = data.ledRegions.map((region) => `${region.name} (${region.code})`).join(", ");
  const leaderName = getFullName(
    data.teamLeader.first_name,
    data.teamLeader.last_name,
    data.teamLeader.middle_name
  );
  const activityLabel = data.reportIsToday ? "Activity Today" : "Activity";
  const clockedInLabel = data.reportIsToday ? "Clocked In" : "Clocked In (Day End)";
  const summaryItems: { label: string; value: number; sex: SexCount }[] = [
    { label: "Team Members", value: data.summary.totalMembers, sex: data.summary.sex.totalMembers },
    { label: "Deployed", value: data.summary.deployed, sex: data.summary.sex.deployed },
    { label: "On Standby", value: data.summary.onStandby, sex: data.summary.sex.onStandby },
    { label: "On Leave", value: data.summary.onLeave, sex: data.summary.sex.onLeave },
    { label: clockedInLabel, value: data.summary.clockedInNow, sex: data.summary.sex.clockedInNow },
    {
      label: activityLabel,
      value: data.summary.withActivityToday,
      sex: data.summary.sex.withActivityToday,
    },
  ];

  return (
    <div className="space-y-4 team-daily-report" id="team-daily-report">
      <ReportPrintHeader
        reportTitle={`Daily Team Report — ${data.scopeLabel}`}
        lines={[
          `Report Date: ${data.reportDate}${data.reportIsToday ? " (Today)" : ""} · Team Leader: ${leaderName} · Region: ${data.scopeLabel}`,
          `Generated ${formatDate(data.generatedAt)} · Developed by ${CREATED_BY}`,
        ]}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                {data.reportIsToday ? "Today's Team Snapshot" : "Team Report"}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Team leader and member deployment details for{" "}
                <span className="font-medium text-foreground">{data.reportDate}</span>
                {allLedRegions.length > 1 && (
                  <>
                    {" "}
                    · <span className="font-medium text-foreground">{data.scopeLabel}</span>
                  </>
                )}
                . Row 1 is the team leader; following rows are team members.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {formatDate(data.generatedAt)}
                {isRefreshing && " · Refreshing..."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadTeamDailyReportExcel(data)}>
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
              <Button variant="outline" size="sm" onClick={printTeamDailyReport}>
                <Printer className="h-4 w-4" />
                Print Report
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="px-6 pb-2">
          <DailyReportFiltersBar
            filterOptions={filterOptions}
            appliedFilters={data.appliedFilters}
            showRegionFilter={allLedRegions.length > 1}
            showTeamFilter={false}
            isPending={isRefreshing}
            onApply={loadReport}
          />
        </div>

        <CardContent className="space-y-6">
          <div className="rounded-lg border border-dswd-border bg-dswd-light p-4 space-y-2 text-sm">
            <p className="text-xs font-semibold text-dswd-navy uppercase tracking-wide">
              Report Coverage
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <p className="text-muted-foreground">Team Leader</p>
                <p className="font-semibold text-dswd-navy">{leaderName}</p>
                <p className="text-xs font-mono text-muted-foreground">{data.teamLeader.employee_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Region</p>
                <p className="font-medium">{regionLabel}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Report Date</p>
                <p className="font-medium">{data.reportDate}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-dswd-border p-3 text-center bg-white"
              >
                <p className="text-xl font-bold text-dswd-navy">{item.value}</p>
                <SexBreakdown count={item.sex} className="mt-0.5" />
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          <OperationsReportMembersTable
            leaderRow={data.leaderActivity}
            members={data.members}
            showAttendance={false}
            showDutyColumn={false}
            emptyMessage="No team personnel records to display."
          />
        </CardContent>
      </Card>
    </div>
  );
}
