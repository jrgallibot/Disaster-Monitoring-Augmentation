import type { EmployeeSex, SexCount, TeamDailyReportMember, TeamDailyReportSexStats } from "@/lib/types";

type SexSource = { sex?: EmployeeSex | null };

export function countSex(items: SexSource[]): SexCount {
  let male = 0;
  let female = 0;

  for (const item of items) {
    if (item.sex === "male") male += 1;
    else if (item.sex === "female") female += 1;
  }

  return { male, female };
}

export function formatSexBreakdown(count: SexCount): string {
  return `M: ${count.male} · F: ${count.female}`;
}

export function isMale(sex: EmployeeSex | null | undefined): boolean {
  return sex === "male";
}

export function formatSexLabel(sex: EmployeeSex | null | undefined): string {
  if (sex === "male") return "Male";
  if (sex === "female") return "Female";
  return "—";
}

export function buildTeamReportSexStats(members: TeamDailyReportMember[]): TeamDailyReportSexStats {
  const employees = members.map((member) => member.employee);

  return {
    totalMembers: countSex(employees),
    deployed: countSex(
      members
        .filter((member) => member.employee.status?.name === "Deployed")
        .map((member) => member.employee)
    ),
    onStandby: countSex(
      members
        .filter((member) => member.employee.status?.name === "On Standby")
        .map((member) => member.employee)
    ),
    onLeave: countSex(
      members
        .filter((member) => member.employee.status?.name === "On Leave")
        .map((member) => member.employee)
    ),
    clockedInNow: countSex(
      members.filter((member) => member.isClockedIn).map((member) => member.employee)
    ),
    withActivityToday: countSex(
      members
        .filter((member) => member.todayAccomplishments.length > 0)
        .map((member) => member.employee)
    ),
  };
}
