"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { StatusChart } from "@/components/dashboard/StatusChart";
import { RegionChart } from "@/components/dashboard/RegionChart";
import { EmployeeTable } from "@/components/dashboard/EmployeeTable";
import { AdminExtendedStats } from "@/components/admin/dashboard/AdminExtendedStats";
import { SpecializationChart } from "@/components/admin/dashboard/SpecializationChart";
import { ClockedInPanel } from "@/components/admin/dashboard/ClockedInPanel";
import { TeamLeaderOverviewPanel } from "@/components/admin/dashboard/TeamLeaderOverviewPanel";
import { AdminOperationsReportPanel } from "@/components/admin/AdminOperationsReportPanel";
import { EmployeePortalCTA } from "@/components/employee/EmployeePortalCTA";
import {
  getPublicDashboardData,
  getPublicOperationsReportData,
} from "@/lib/actions/public-dashboard";
import { CREATED_BY, SYSTEM_NAME, SYSTEM_TAGLINE } from "@/lib/branding";
import {
  downloadAdminOperationsReportExcel,
  downloadAdminReportExcel,
  printAdminOperationsReport,
  printAdminReport,
} from "@/lib/report-export";
import { formatDate, getFullName } from "@/lib/utils";
import type {
  AdminDashboardData,
  AdminOperationsReportData,
  LibraryRegion,
  LibrarySpecialization,
  LibraryStatus,
} from "@/lib/types";
import { Download, Printer, RefreshCw, Radio, Shield } from "lucide-react";

interface PublicDashboardPanelProps {
  initialData: AdminDashboardData;
  operationsReport: AdminOperationsReportData;
  regions: LibraryRegion[];
  statuses: LibraryStatus[];
  specializations: LibrarySpecialization[];
}

const REFRESH_MS = 60000;

export function PublicDashboardPanel({
  initialData,
  operationsReport: initialOperationsReport,
  regions,
  statuses,
  specializations,
}: PublicDashboardPanelProps) {
  const [data, setData] = useState(initialData);
  const [operationsReport, setOperationsReport] = useState(initialOperationsReport);
  const [isRefreshing, startRefresh] = useTransition();
  const [lastRefresh, setLastRefresh] = useState(initialData.generatedAt);

  const refresh = useCallback(() => {
    startRefresh(async () => {
      try {
        const [next, nextOperations] = await Promise.all([
          getPublicDashboardData(),
          getPublicOperationsReportData(),
        ]);
        setData(next);
        setOperationsReport(nextOperations);
        setLastRefresh(next.generatedAt);
      } catch {
        // keep existing data on refresh failure
      }
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const recent = data.employees.slice(0, 8);
  const deployedPct = data.stats.total
    ? Math.round((data.stats.deployed / data.stats.total) * 100)
    : 0;

  return (
    <div className="space-y-6 public-dashboard-report" id="public-dashboard-report">
      <div className="hidden print:block mb-6 border-b-2 border-dswd-gold pb-4">
        <h1 className="text-2xl font-bold text-dswd-navy">{SYSTEM_NAME}</h1>
        <p className="text-sm text-muted-foreground">
          Public Monitoring Report · Generated {formatDate(data.generatedAt)} · {CREATED_BY}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="gov-section-title">Public Monitoring Dashboard</h1>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
              <Radio className="h-3 w-3 animate-pulse" />
              Live Data
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{SYSTEM_TAGLINE}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {formatDate(lastRefresh)}
            {isRefreshing && " · Refreshing..."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadAdminReportExcel(data)}>
            <Download className="h-4 w-4" />
            Export Summary
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadAdminOperationsReportExcel(operationsReport)}
          >
            <Download className="h-4 w-4" />
            Export Operations
          </Button>
          <Button variant="outline" size="sm" onClick={printAdminReport}>
            <Printer className="h-4 w-4" />
            Print Dashboard
          </Button>
          <Button variant="outline" size="sm" onClick={printAdminOperationsReport}>
            <Printer className="h-4 w-4" />
            Print Operations
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/login">
              <Shield className="h-4 w-4" />
              Admin Login
            </Link>
          </Button>
        </div>
      </div>

      <EmployeePortalCTA />

      <StatsCards stats={data.stats} />

      <Card className="bg-gradient-to-r from-dswd-navy to-dswd-blue text-white border-0">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-blue-100">Deployment Readiness</p>
              <p className="text-3xl font-bold mt-1">{deployedPct}% Deployed</p>
              <p className="text-sm text-blue-100 mt-1">
                {data.stats.deployed} of {data.stats.total} augmented employees actively deployed
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold">{data.extended.clockedIn}</p>
                <p className="text-xs text-blue-100">Timed In Now</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{data.extended.todayTimeIn}</p>
                <p className="text-xs text-blue-100">Time In Today</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{data.extended.withGps}</p>
                <p className="text-xs text-blue-100">GPS Tracked</p>
              </div>
            </div>
          </div>
          <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-dswd-gold rounded-full transition-all duration-500"
              style={{ width: `${deployedPct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <AdminExtendedStats extended={data.extended} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusChart stats={data.stats} />
        <RegionChart stats={data.stats} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpecializationChart data={data.bySpecialization} />
        <ClockedInPanel
          employees={data.clockedInEmployees}
          employeeDetailPath={(id) => `/employees/${id}`}
        />
      </div>

      <TeamLeaderOverviewPanel
        regionTeams={data.regionTeams}
        statuses={data.statuses}
        publicView
      />

      <AdminOperationsReportPanel
        initialData={operationsReport}
        publicView
        onRefresh={getPublicOperationsReportData}
      />

      <Card>
        <CardHeader>
          <CardTitle>Recently Updated Employees</CardTitle>
          <p className="text-sm text-muted-foreground">
            Latest profile and deployment changes across all monitored personnel
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recent.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-3 border border-dswd-border rounded-lg hover:bg-dswd-light/40 transition-colors"
              >
                <div className="min-w-0">
                  <Link
                    href={`/employees/${emp.id}`}
                    className="font-medium text-dswd-blue hover:underline print:text-black print:no-underline truncate block"
                  >
                    {getFullName(emp.first_name, emp.last_name, emp.middle_name)}
                  </Link>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {emp.employee_id}
                    {emp.region ? ` · ${emp.region.code}` : ""}
                    {emp.specialization ? ` · ${emp.specialization.name}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  {emp.status && (
                    <Badge color={emp.status.color}>{emp.status.name}</Badge>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(emp.updated_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <EmployeeTable
        employees={data.employees}
        regions={regions}
        statuses={statuses}
        specializations={specializations}
        publicEnriched
        title="All Augmented Employees"
      />
    </div>
  );
}
