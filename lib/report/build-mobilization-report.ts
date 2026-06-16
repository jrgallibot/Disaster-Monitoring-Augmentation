import { createServiceClient } from "@/lib/supabase/service";
import { queryEmployeeRows } from "@/lib/supabase/employee-query";
import {
  computeAugmentationDurationDays,
  employeeOverlapsMobilizationRange,
} from "@/lib/mobilization";
import { countSex } from "@/lib/sex-stats";
import { getTodayInputValue } from "@/lib/report/date-bounds";
import type {
  EmployeeWithRelations,
  MobilizationReportData,
  MobilizationReportFilters,
  MobilizationReportRow,
} from "@/lib/types";
import { getFullName, getRegionTeamLeaderSummaries } from "@/lib/utils";

function normalizeDateKey(value: string | null | undefined, fallback: string): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return fallback;
}

function buildScopeLabel(filters: MobilizationReportFilters, employees: EmployeeWithRelations[]): string {
  const parts: string[] = [];

  if (filters.regionId) {
    const region = employees.find((e) => e.region_id === filters.regionId)?.region;
    if (region) parts.push(region.name);
  } else {
    parts.push("All Regions");
  }

  if (filters.teamLeaderId) {
    const leader = employees.find((e) => e.id === filters.teamLeaderId);
    if (leader) {
      parts.push(
        `Team: ${getFullName(leader.first_name, leader.last_name, leader.middle_name)}`
      );
    }
  }

  if (filters.statusFilter && filters.statusFilter !== "all") {
    parts.push(filters.statusFilter === "mobilized" ? "Mobilized Only" : "Demobilized Only");
  }

  return parts.join(" · ");
}

function employeeMatchesTeamFilter(
  employee: EmployeeWithRelations,
  regionId: string | null | undefined,
  teamLeaderId: string | null | undefined
): boolean {
  if (regionId && employee.region_id !== regionId) return false;
  if (!teamLeaderId) return true;

  if (employee.assigned_team_leader_id === teamLeaderId) return true;

  const regionLeaders = getRegionTeamLeaderSummaries(employee.region);
  if (regionLeaders.length === 1 && regionLeaders[0].id === teamLeaderId) {
    return !employee.assigned_team_leader_id || employee.assigned_team_leader_id === teamLeaderId;
  }

  return employee.assigned_team_leader_id === teamLeaderId;
}

function filterEmployees(
  employees: EmployeeWithRelations[],
  filters: MobilizationReportFilters,
  dateFrom: string,
  dateTo: string
): EmployeeWithRelations[] {
  return employees.filter((employee) => {
    if (!employeeOverlapsMobilizationRange(employee.mobilized_at, employee.demobilized_at, dateFrom, dateTo)) {
      return false;
    }

    if (!employeeMatchesTeamFilter(employee, filters.regionId, filters.teamLeaderId)) {
      return false;
    }

    if (filters.statusFilter && filters.statusFilter !== "all") {
      return employee.mobilization_status === filters.statusFilter;
    }

    return true;
  });
}

function buildRows(employees: EmployeeWithRelations[], dateTo: string): MobilizationReportRow[] {
  return employees
    .map((employee) => ({
      employee,
      durationDays: computeAugmentationDurationDays(
        employee.mobilized_at,
        employee.demobilized_at,
        dateTo
      ),
    }))
    .sort((a, b) => {
      const aDate = a.employee.mobilized_at ?? "";
      const bDate = b.employee.mobilized_at ?? "";
      return bDate.localeCompare(aDate);
    });
}

export async function buildMobilizationReportData(
  filters: MobilizationReportFilters = {},
  scopedRegionIds?: string[] | null
): Promise<MobilizationReportData> {
  const todayKey = getTodayInputValue();
  const dateFrom = normalizeDateKey(filters.dateFrom, todayKey);
  const dateTo = normalizeDateKey(filters.dateTo, todayKey);
  const effectiveDateFrom = dateFrom <= dateTo ? dateFrom : dateTo;
  const effectiveDateTo = dateFrom <= dateTo ? dateTo : dateFrom;

  const supabase = createServiceClient();
  let employees = await queryEmployeeRows(supabase, (select) => {
    let query = supabase.from("employees").select(select).order("last_name");
    if (scopedRegionIds && scopedRegionIds.length > 0) {
      query = query.in("region_id", scopedRegionIds);
    }
    return query;
  });

  if (scopedRegionIds && scopedRegionIds.length > 0) {
    employees = employees.filter((employee) =>
      employee.region_id ? scopedRegionIds.includes(employee.region_id) : false
    );
  }

  const filtered = filterEmployees(employees, filters, effectiveDateFrom, effectiveDateTo);
  const rows = buildRows(filtered, effectiveDateTo);

  const summary = {
    totalInRange: rows.length,
    mobilizedNow: rows.filter((row) => row.employee.mobilization_status === "mobilized").length,
    demobilizedNow: rows.filter((row) => row.employee.mobilization_status === "demobilized").length,
    sex: {
      totalInRange: countSex(rows.map((row) => row.employee)),
      mobilizedNow: countSex(
        rows
          .filter((row) => row.employee.mobilization_status === "mobilized")
          .map((row) => row.employee)
      ),
      demobilizedNow: countSex(
        rows
          .filter((row) => row.employee.mobilization_status === "demobilized")
          .map((row) => row.employee)
      ),
    },
  };

  return {
    generatedAt: new Date().toISOString(),
    dateFrom: effectiveDateFrom,
    dateTo: effectiveDateTo,
    scopeLabel: buildScopeLabel(filters, employees),
    appliedFilters: {
      ...filters,
      dateFrom: effectiveDateFrom,
      dateTo: effectiveDateTo,
    },
    rows,
    summary,
  };
}
