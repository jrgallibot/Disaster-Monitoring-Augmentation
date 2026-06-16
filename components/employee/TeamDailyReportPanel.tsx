"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DailyReportFiltersBar } from "@/components/shared/DailyReportFiltersBar";
import { getTeamDailyReportData } from "@/lib/actions/team-leader";
import { SYSTEM_NAME, CREATED_BY } from "@/lib/branding";
import { formatCoordinates, hasValidCoordinates } from "@/lib/geo";
import {
  downloadTeamDailyReportExcel,
  printTeamDailyReport,
} from "@/lib/report-export";
import { formatDate, formatTime, getFullName } from "@/lib/utils";
import type { DailyReportFilterOptions, DailyReportFilters, TeamDailyReportData } from "@/lib/types";
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
  const attendanceNowLabel = data.reportIsToday ? "Now" : "End of Day";

  return (
    <div className="space-y-4 team-daily-report" id="team-daily-report">
      <div className="hidden print:block mb-6 border-b-2 border-dswd-gold pb-4">
        <h1 className="text-2xl font-bold text-dswd-navy">{SYSTEM_NAME}</h1>
        <h2 className="text-lg font-semibold text-dswd-navy mt-1">
          Daily Team Report — {data.scopeLabel}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Report Date: {data.reportDate}
          {data.reportIsToday ? " (Today)" : ""} · Region: {data.scopeLabel} · Generated{" "}
          {formatDate(data.generatedAt)} · Developed by {CREATED_BY}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                {data.reportIsToday ? "Today's Team Snapshot" : "Team Report"}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Actual tasks, deployment details, and member activity for{" "}
                <span className="font-medium text-foreground">{data.reportDate}</span>
                {allLedRegions.length > 1 && (
                  <>
                    {" "}
                    · <span className="font-medium text-foreground">{data.scopeLabel}</span>
                  </>
                )}
                .
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
          <div className="rounded-lg border border-dswd-border bg-dswd-light p-4 space-y-3">
            <p className="text-xs font-semibold text-dswd-navy uppercase tracking-wide">
              Team Leader
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-semibold text-dswd-navy">{leaderName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Employee ID</p>
                <p className="font-mono font-medium">{data.teamLeader.employee_id}</p>
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
            {[
              { label: "Team Members", value: data.summary.totalMembers },
              { label: "Deployed", value: data.summary.deployed },
              { label: "On Standby", value: data.summary.onStandby },
              { label: "On Leave", value: data.summary.onLeave },
              { label: clockedInLabel, value: data.summary.clockedInNow },
              { label: activityLabel, value: data.summary.withActivityToday },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-dswd-border p-3 text-center bg-white"
              >
                <p className="text-xl font-bold text-dswd-navy">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          {data.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No team members are assigned to you yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-dswd-border">
              <table className="w-full text-sm">
                <thead className="bg-dswd-light">
                  <tr>
                    <th className="text-left p-3 font-semibold text-dswd-navy">#</th>
                    <th className="text-left p-3 font-semibold text-dswd-navy">Member</th>
                    <th className="text-left p-3 font-semibold text-dswd-navy">Specialization</th>
                    <th className="text-left p-3 font-semibold text-dswd-navy">Status</th>
                    <th className="text-left p-3 font-semibold text-dswd-navy min-w-[160px]">
                      Actual Task
                    </th>
                    <th className="text-left p-3 font-semibold text-dswd-navy min-w-[140px]">
                      Deployment Location
                    </th>
                    <th className="text-left p-3 font-semibold text-dswd-navy min-w-[160px]">
                      Remarks
                    </th>
                    <th className="text-left p-3 font-semibold text-dswd-navy min-w-[200px]">
                      Actual Duty {data.reportIsToday ? "Today" : ""}
                    </th>
                    <th className="text-left p-3 font-semibold text-dswd-navy">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.members.map((member, index) => {
                    const employee = member.employee;
                    const memberName = getFullName(
                      employee.first_name,
                      employee.last_name,
                      employee.middle_name
                    );

                    return (
                      <tr key={employee.id} className="border-t border-dswd-border align-top">
                        <td className="p-3 text-muted-foreground">{index + 1}</td>
                        <td className="p-3">
                          <p className="font-medium text-dswd-navy">{memberName}</p>
                          <p className="text-xs font-mono text-muted-foreground">
                            {employee.employee_id}
                          </p>
                        </td>
                        <td className="p-3">{employee.specialization?.name ?? "—"}</td>
                        <td className="p-3">
                          {employee.status ? (
                            <Badge color={employee.status.color}>{employee.status.name}</Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3 whitespace-pre-wrap">{employee.actual_task ?? "—"}</td>
                        <td className="p-3">{employee.deployment_location ?? "—"}</td>
                        <td className="p-3 whitespace-pre-wrap">{employee.deployment_remarks ?? "—"}</td>
                        <td className="p-3 whitespace-pre-wrap">{member.todayDutySummary}</td>
                        <td className="p-3 space-y-1">
                          <p>
                            In:{" "}
                            <span className="font-medium">
                              {member.todayTimeIn ? formatTime(member.todayTimeIn) : "—"}
                            </span>
                          </p>
                          <p>
                            Out:{" "}
                            <span className="font-medium">
                              {member.todayTimeOut ? formatTime(member.todayTimeOut) : "—"}
                            </span>
                          </p>
                          <p>
                            {attendanceNowLabel}:{" "}
                            <span
                              className={
                                member.isClockedIn
                                  ? "font-medium text-green-700"
                                  : "font-medium text-muted-foreground"
                              }
                            >
                              {member.isClockedIn ? "Clocked In" : "Not Clocked In"}
                            </span>
                          </p>
                          {hasValidCoordinates(employee.last_latitude, employee.last_longitude) && (
                            <p className="text-xs text-muted-foreground">
                              GPS: {formatCoordinates(employee.last_latitude, employee.last_longitude)}
                            </p>
                          )}
                        </td>
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
