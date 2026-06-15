"use server";

import { getRegions } from "@/lib/actions/employees";
import { requireAdminPortalRead } from "@/lib/actions/auth";
import { buildOperationsReportData } from "@/lib/report/build-operations-report";
import type {
  AdminOperationsReportData,
  DailyReportFilterOptions,
  DailyReportFilters,
} from "@/lib/types";
import { getFullName, getRegionTeamLeaderSummaries } from "@/lib/utils";

export async function getAdminOperationsReportData(
  filters: DailyReportFilters = {}
): Promise<AdminOperationsReportData> {
  await requireAdminPortalRead();
  return buildOperationsReportData(filters);
}

export async function getAdminDailyReportFilterOptions(): Promise<DailyReportFilterOptions> {
  await requireAdminPortalRead();
  const regions = (await getRegions()).filter((region) => region.is_active);
  const teams: DailyReportFilterOptions["teams"] = [];

  for (const region of regions) {
    for (const leader of getRegionTeamLeaderSummaries(region)) {
      teams.push({
        regionId: region.id,
        teamLeaderId: leader.id,
        label: `${getFullName(leader.first_name, leader.last_name, leader.middle_name)} — ${region.name} (${region.code})`,
      });
    }
  }

  return {
    regions: regions.map((region) => ({
      id: region.id,
      name: region.name,
      code: region.code,
    })),
    teams,
  };
}
