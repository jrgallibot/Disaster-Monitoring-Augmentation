import { employeeIsVisibleTeamMember } from "@/lib/auth/team-leader";
import { getEmployees, getRegions } from "@/lib/actions/employees";
import { getReportDateBounds } from "@/lib/report/date-bounds";
import { countSex } from "@/lib/sex-stats";
import {
  buildMemberReports,
  buildTeamDailyReportMember,
  buildTeamSummary,
  fetchMemberReportMaps,
} from "@/lib/report/member-report";
import type {
  AdminOperationsReportData,
  AdminTeamLeaderReport,
  DailyReportFilterOptionTeam,
  DailyReportFilters,
} from "@/lib/types";
import { getFullName, getRegionTeamLeaderSummaries } from "@/lib/utils";

function buildScopeLabel(
  filters: DailyReportFilters,
  teamOptions: DailyReportFilterOptionTeam[]
): string {
  if (filters.teamLeaderId) {
    const match = teamOptions.find(
      (team) =>
        team.teamLeaderId === filters.teamLeaderId &&
        (!filters.regionId || team.regionId === filters.regionId)
    );
    if (match) return match.label;
  }

  if (filters.regionId) {
    const regionTeam = teamOptions.find((team) => team.regionId === filters.regionId);
    if (regionTeam) {
      const regionName = regionTeam.label.split(" — ").pop();
      if (regionName) return regionName;
    }
  }

  return "All Teams";
}

export async function buildOperationsReportData(
  filters: DailyReportFilters = {}
): Promise<AdminOperationsReportData> {
  const [employees, regions] = await Promise.all([getEmployees(), getRegions()]);
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
  const bounds = getReportDateBounds(filters.dateKey);
  const activeRegions = regions.filter((item) => item.is_active);

  const teamOptions: DailyReportFilterOptionTeam[] = [];
  for (const region of activeRegions) {
    for (const leaderSummary of getRegionTeamLeaderSummaries(region)) {
      teamOptions.push({
        regionId: region.id,
        teamLeaderId: leaderSummary.id,
        label: `${getFullName(
          leaderSummary.first_name,
          leaderSummary.last_name,
          leaderSummary.middle_name
        )} — ${region.name} (${region.code})`,
      });
    }
  }

  const allMemberIds = employees.map((employee) => employee.id);
  const maps = await fetchMemberReportMaps(allMemberIds, bounds.start, bounds.end);

  const teams: AdminTeamLeaderReport[] = [];

  for (const region of activeRegions) {
    if (filters.regionId && region.id !== filters.regionId) continue;

    const leaders = getRegionTeamLeaderSummaries(region);
    const regionLeaderIds = new Set(leaders.map((leader) => leader.id));

    for (const leaderSummary of leaders) {
      if (filters.teamLeaderId && leaderSummary.id !== filters.teamLeaderId) continue;

      const teamLeader = employeeMap.get(leaderSummary.id);
      if (!teamLeader) continue;

      const members = employees.filter((employee) =>
        employeeIsVisibleTeamMember(
          employee,
          leaderSummary.id,
          [region.id],
          regionLeaderIds
        )
      );

      const memberReports = buildMemberReports(
        members,
        maps.accomplishmentsByEmployee,
        maps.attendanceByEmployee,
        maps.latestAttendanceByEmployee,
        bounds.isToday
      );

      const leaderActivity = buildTeamDailyReportMember(
        teamLeader,
        maps.accomplishmentsByEmployee,
        maps.attendanceByEmployee,
        maps.latestAttendanceByEmployee,
        bounds.isToday
      );

      teams.push({
        region,
        teamLeader,
        leaderActivity,
        members: memberReports,
        summary: buildTeamSummary(memberReports),
      });
    }
  }

  teams.sort((a, b) => {
    const regionSort = a.region.sort_order - b.region.sort_order;
    if (regionSort !== 0) return regionSort;
    return a.teamLeader.last_name.localeCompare(b.teamLeader.last_name);
  });

  const allMembers = teams.flatMap((team) => team.members);
  const uniqueMemberIds = new Set(allMembers.map((member) => member.employee.id));
  const uniqueMembers = employees.filter((employee) => uniqueMemberIds.has(employee.id));
  const membersWithActivity = new Set(
    allMembers
      .filter((member) => member.todayAccomplishments.length > 0)
      .map((member) => member.employee.id)
  );
  const membersClockedIn = new Set(
    allMembers.filter((member) => member.isClockedIn).map((member) => member.employee.id)
  );

  const appliedFilters: DailyReportFilters = {
    dateKey: bounds.dateKey,
    regionId: filters.regionId ?? null,
    teamLeaderId: filters.teamLeaderId ?? null,
  };

  return {
    generatedAt: new Date().toISOString(),
    reportDate: bounds.label,
    reportDateKey: bounds.dateKey,
    reportIsToday: bounds.isToday,
    scopeLabel: buildScopeLabel(appliedFilters, teamOptions),
    appliedFilters,
    teams,
    summary: {
      totalTeams: teams.length,
      totalTeamLeaders: teams.length,
      totalMembers: uniqueMemberIds.size,
      deployed: uniqueMembers.filter((employee) => employee.status?.name === "Deployed").length,
      onStandby: uniqueMembers.filter((employee) => employee.status?.name === "On Standby")
        .length,
      onLeave: uniqueMembers.filter((employee) => employee.status?.name === "On Leave").length,
      clockedInNow: membersClockedIn.size,
      withActivityToday: membersWithActivity.size,
      sex: {
        totalMembers: countSex(uniqueMembers),
        deployed: countSex(
          uniqueMembers.filter((employee) => employee.status?.name === "Deployed")
        ),
        onStandby: countSex(
          uniqueMembers.filter((employee) => employee.status?.name === "On Standby")
        ),
        onLeave: countSex(
          uniqueMembers.filter((employee) => employee.status?.name === "On Leave")
        ),
        clockedInNow: countSex(
          uniqueMembers.filter((employee) => membersClockedIn.has(employee.id))
        ),
        withActivityToday: countSex(
          uniqueMembers.filter((employee) => membersWithActivity.has(employee.id))
        ),
      },
    },
  };
}
