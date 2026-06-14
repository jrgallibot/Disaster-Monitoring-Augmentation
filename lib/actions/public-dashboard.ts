"use server";

import { getAdminDashboardData } from "@/lib/actions/employees";
import { buildOperationsReportData } from "@/lib/report/build-operations-report";
import type { AdminDashboardData, AdminOperationsReportData } from "@/lib/types";

export async function getPublicDashboardData(): Promise<AdminDashboardData> {
  return getAdminDashboardData();
}

export async function getPublicOperationsReportData(): Promise<AdminOperationsReportData> {
  return buildOperationsReportData();
}
