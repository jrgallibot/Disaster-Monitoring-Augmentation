"use server";

import { requireAdminPortalRead } from "@/lib/actions/auth";
import { buildOperationsReportData } from "@/lib/report/build-operations-report";
import type { AdminOperationsReportData } from "@/lib/types";

export async function getAdminOperationsReportData(): Promise<AdminOperationsReportData> {
  await requireAdminPortalRead();
  return buildOperationsReportData();
}
