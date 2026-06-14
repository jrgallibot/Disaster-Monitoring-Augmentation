"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { StatusChart } from "@/components/dashboard/StatusChart";
import { RegionChart } from "@/components/dashboard/RegionChart";
import { AdminExtendedStats } from "@/components/admin/dashboard/AdminExtendedStats";
import { SpecializationChart } from "@/components/admin/dashboard/SpecializationChart";
import { ClockedInPanel } from "@/components/admin/dashboard/ClockedInPanel";
import { TeamLeaderOverviewPanel } from "@/components/admin/dashboard/TeamLeaderOverviewPanel";
import { AdminOperationsReportPanel } from "@/components/admin/AdminOperationsReportPanel";
import { getAdminOperationsReportData } from "@/lib/actions/admin-reports";
import { getAdminDashboardData } from "@/lib/actions/employees";
import { SYSTEM_NAME, CREATED_BY } from "@/lib/branding";
import {
  downloadAdminOperationsReportExcel,
  downloadAdminReportExcel,
  printAdminOperationsReport,
  printAdminReport,
} from "@/lib/report-export";
import { formatDate, getFullName } from "@/lib/utils";
import type { AdminDashboardData, AdminOperationsReportData } from "@/lib/types";
import {
  BookOpen,
  Download,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Radio,
} from "lucide-react";

interface AdminDashboardPanelProps {
  initialData: AdminDashboardData;
  operationsReport: AdminOperationsReportData;
}

const REFRESH_MS = 30000;

export function AdminDashboardPanel({
  initialData,
  operationsReport: initialOperationsReport,
}: AdminDashboardPanelProps) {
  const [data, setData] = useState(initialData);
  const [operationsReport, setOperationsReport] = useState(initialOperationsReport);
  const [isRefreshing, startRefresh] = useTransition();
  const [lastRefresh, setLastRefresh] = useState(initialData.generatedAt);

  const refresh = useCallback(() => {
    startRefresh(async () => {
      try {
        const [next, nextOperations] = await Promise.all([
          getAdminDashboardData(),
          getAdminOperationsReportData(),
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

  const recent = data.employees.slice(0, 6);
  const deployedPct = data.stats.total
    ? Math.round((data.stats.deployed / data.stats.total) * 100)
    : 0;

  return (
    <div className="space-y-6 admin-dashboard-report" id="admin-dashboard-report">
      <div className="hidden print:block mb-6 border-b-2 border-dswd-gold pb-4">
        <h1 className="text-2xl font-bold text-dswd-navy">
          {SYSTEM_NAME} Report
        </h1>
        <p className="text-sm text-muted-foreground">
          Generated {formatDate(data.generatedAt)} · Developed by {CREATED_BY}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="gov-section-title">Admin Dashboard</h1>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
              <Radio className="h-3 w-3 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Real-time overview of deployment, attendance, and employee monitoring
          </p>
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
            <FileText className="h-4 w-4" />
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
            <Link href="/admin/reports/daily-operations">
              <FileText className="h-4 w-4" />
              Daily Operations Report
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/employees/new">
              <Plus className="h-4 w-4" />
              Add Employee
            </Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link href="/admin/libraries">
              <BookOpen className="h-4 w-4" />
              Libraries
            </Link>
          </Button>
        </div>
      </div>

      <StatsCards stats={data.stats} />

      <Card className="bg-gradient-to-r from-dswd-navy to-dswd-blue text-white border-0">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-blue-100">Deployment Readiness</p>
              <p className="text-3xl font-bold mt-1">{deployedPct}% Deployed</p>
              <p className="text-sm text-blue-100 mt-1">
                {data.stats.deployed} of {data.stats.total} employees actively deployed
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold">{data.extended.clockedIn}</p>
                <p className="text-xs text-blue-100">Timed In</p>
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
        <ClockedInPanel employees={data.clockedInEmployees} />
      </div>

      <TeamLeaderOverviewPanel regionTeams={data.regionTeams} statuses={data.statuses} />

      <AdminOperationsReportPanel initialData={operationsReport} compact />

      <Card>
        <CardHeader>
          <CardTitle>Recently Updated Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recent.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-3 border border-dswd-border rounded-lg"
              >
                <div>
                  <Link
                    href={`/admin/employees/${emp.id}/edit`}
                    className="font-medium text-dswd-blue hover:underline print:text-black print:no-underline"
                  >
                    {getFullName(emp.first_name, emp.last_name, emp.middle_name)}
                  </Link>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {emp.employee_id}
                    {emp.region ? ` · ${emp.region.code}` : ""}
                  </p>
                </div>
                <div className="text-right">
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
    </div>
  );
}
