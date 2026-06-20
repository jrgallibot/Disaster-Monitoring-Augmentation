"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyReportFiltersBar } from "@/components/shared/DailyReportFiltersBar";
import { OperationsReportMembersTable } from "@/components/shared/OperationsReportMembersTable";
import { SexBreakdown } from "@/components/shared/SexBreakdown";
import { TablePagination } from "@/components/shared/TablePagination";
import { ReportPrintHeader } from "@/components/brand/ReportPrintHeader";
import { getAdminOperationsReportData } from "@/lib/actions/admin-reports";
import { CREATED_BY } from "@/lib/branding";
import { paginate } from "@/lib/pagination";
import {
  downloadAdminOperationsReportExcel,
  printAdminOperationsReport,
} from "@/lib/report-export";
import { formatDate, getFullName } from "@/lib/utils";
import type { AdminOperationsReportData, DailyReportFilterOptions, DailyReportFilters, SexCount } from "@/lib/types";
import { Download, ExternalLink, FileText, Printer, RefreshCw, UserCog } from "lucide-react";

interface AdminOperationsReportPanelProps {
  initialData: AdminOperationsReportData;
  filterOptions?: DailyReportFilterOptions;
  compact?: boolean;
  publicView?: boolean;
  showFilters?: boolean;
  onRefresh?: (filters?: DailyReportFilters) => Promise<AdminOperationsReportData>;
  teamsPerPage?: number;
}

export function AdminOperationsReportPanel({
  initialData,
  filterOptions,
  compact = false,
  publicView = false,
  showFilters = false,
  onRefresh,
  teamsPerPage = 3,
}: AdminOperationsReportPanelProps) {
  const [data, setData] = useState(initialData);
  const [isRefreshing, startRefresh] = useTransition();
  const [teamPage, setTeamPage] = useState(1);

  useEffect(() => {
    setTeamPage(1);
  }, [data.teams, data.reportDate, data.scopeLabel]);

  const loadReport = useCallback(
    (filters?: DailyReportFilters) => {
      startRefresh(async () => {
        try {
          const next = onRefresh
            ? await onRefresh(filters ?? data.appliedFilters)
            : await getAdminOperationsReportData(filters ?? data.appliedFilters);
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

  const activityLabel = data.reportIsToday ? "Activity Today" : "Activity";
  const clockedInLabel = data.reportIsToday ? "Clocked In" : "Clocked In (Day End)";
  const teamPagination = paginate(data.teams, teamPage, teamsPerPage);
  const pagedTeams = teamPagination.items;

  const summaryItems: { label: string; value: number; sex?: SexCount }[] = [
    { label: "Team Leaders", value: data.summary.totalTeamLeaders },
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
    <div className="space-y-4 admin-operations-report" id="admin-operations-report">
      <ReportPrintHeader
        reportTitle={`Daily Operations Report — ${data.scopeLabel}`}
        lines={[
          `Report Date: ${data.reportDate}${data.reportIsToday ? " (Today)" : ""} · Scope: ${data.scopeLabel}`,
          `Generated ${formatDate(data.generatedAt)} · Developed by ${CREATED_BY}`,
        ]}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Daily Operations Report
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Team leader and member deployment status, locations, accomplishments, and{" "}
                {data.reportIsToday ? "today's" : "selected day"} accomplishments for{" "}
                <span className="font-medium text-foreground">{data.reportDate}</span>
                {data.scopeLabel !== "All Teams" && (
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadAdminOperationsReportExcel(data)}
              >
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
              <Button variant="outline" size="sm" onClick={printAdminOperationsReport}>
                <Printer className="h-4 w-4" />
                Print Report
              </Button>
              {compact && !publicView && (
                <Button asChild size="sm">
                  <Link href="/admin/reports/daily-operations">
                    <ExternalLink className="h-4 w-4" />
                    Full Report
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {showFilters && filterOptions && (
          <div className="px-6 pb-2">
            <DailyReportFiltersBar
              filterOptions={filterOptions}
              appliedFilters={data.appliedFilters}
              showRegionFilter
              showTeamFilter
              isPending={isRefreshing}
              onApply={loadReport}
            />
          </div>
        )}

        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-dswd-border p-3 text-center bg-white"
              >
                <p className="text-xl font-bold text-dswd-navy">{item.value}</p>
                {item.sex && <SexBreakdown count={item.sex} className="mt-0.5" />}
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          {data.teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {publicView
                ? "No team leader assignments are configured yet."
                : "No team leaders assigned yet. Assign team leaders under Admin → Libraries → Regions."}
            </p>
          ) : compact ? (
            <div className="space-y-3">
              {data.teams.slice(0, 4).map((team) => {
                const leaderName = getFullName(
                  team.teamLeader.first_name,
                  team.teamLeader.last_name,
                  team.teamLeader.middle_name
                );
                return (
                  <div
                    key={`${team.region.id}-${team.teamLeader.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-dswd-border p-3"
                  >
                    <div>
                      <p className="font-medium text-dswd-navy">{leaderName}</p>
                      <p className="text-xs text-muted-foreground">
                        {team.region.name} ({team.region.code}) · {team.summary.totalMembers}{" "}
                        member{team.summary.totalMembers === 1 ? "" : "s"} · {team.summary.deployed}{" "}
                        deployed
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {team.summary.withActivityToday} with {activityLabel.toLowerCase()}
                    </p>
                  </div>
                );
              })}
              {data.teams.length > 4 && !publicView && (
                <Button asChild variant="outline" size="sm" className="print:hidden">
                  <Link href="/admin/reports/daily-operations">
                    View all {data.teams.length} team reports
                  </Link>
                </Button>
              )}
              {data.teams.length > 4 && publicView && (
                <p className="text-xs text-muted-foreground print:hidden">
                  Showing 4 of {data.teams.length} regional teams. Scroll the full operations section below for details.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {pagedTeams.map((team) => {
                const leaderName = getFullName(
                  team.teamLeader.first_name,
                  team.teamLeader.last_name,
                  team.teamLeader.middle_name
                );

                return (
                  <div
                    key={`${team.region.id}-${team.teamLeader.id}`}
                    className="rounded-lg border border-dswd-border overflow-hidden"
                  >
                    <div className="bg-dswd-light px-4 py-4 space-y-3">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-dswd-navy uppercase tracking-wide flex items-center gap-1">
                            <UserCog className="h-4 w-4" />
                            Team Leader
                          </p>
                          <p className="font-semibold text-dswd-navy mt-1">{leaderName}</p>
                          <p className="text-xs font-mono text-muted-foreground">
                            {team.teamLeader.employee_id}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {team.region.name} ({team.region.code})
                          </p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-md border border-dswd-border bg-white px-3 py-2">
                            <p className="font-bold text-dswd-navy">{team.summary.totalMembers}</p>
                            <SexBreakdown count={team.summary.sex.totalMembers} className="mt-0.5" />
                            <p className="text-muted-foreground">Members</p>
                          </div>
                          <div className="rounded-md border border-dswd-border bg-white px-3 py-2">
                            <p className="font-bold text-dswd-navy">{team.summary.deployed}</p>
                            <SexBreakdown count={team.summary.sex.deployed} className="mt-0.5" />
                            <p className="text-muted-foreground">Deployed</p>
                          </div>
                          <div className="rounded-md border border-dswd-border bg-white px-3 py-2">
                            <p className="font-bold text-dswd-navy">
                              {team.summary.withActivityToday}
                            </p>
                            <SexBreakdown count={team.summary.sex.withActivityToday} className="mt-0.5" />
                            <p className="text-muted-foreground">{activityLabel}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-md border border-dswd-border bg-white p-3">
                        <p className="text-xs font-semibold text-dswd-navy uppercase tracking-wide">
                          Team Leader Activity {data.reportIsToday ? "Today" : "on Report Date"}
                        </p>
                        <p className="text-sm text-dswd-navy mt-1 whitespace-pre-wrap">
                          {team.leaderActivity.todayDutySummary}
                        </p>
                      </div>
                    </div>
                    <div className="p-4">
                      <OperationsReportMembersTable
                        leaderRow={team.leaderActivity}
                        members={team.members}
                        showAttendance={false}
                        dutyColumnLabel={
                          data.reportIsToday ? "Accomplishments Today" : "Accomplishments"
                        }
                        emptyMessage="No team personnel records to display."
                      />
                    </div>
                  </div>
                );
              })}
              <TablePagination
                page={teamPagination.page}
                pageSize={teamPagination.pageSize}
                totalItems={teamPagination.totalItems}
                onPageChange={setTeamPage}
                itemLabel="teams"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
