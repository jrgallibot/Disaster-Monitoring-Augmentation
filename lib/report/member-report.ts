import type {
  EmployeeAccomplishment,
  EmployeeAttendance,
  EmployeeWithRelations,
  TeamDailyReportMember,
  TeamDailyReportSummary,
} from "@/lib/types";
import { createServiceClient } from "@/lib/supabase/service";

export function buildTodayDutySummary(accomplishments: EmployeeAccomplishment[]): string {
  if (accomplishments.length === 0) {
    return "No activity reported today.";
  }
  return accomplishments.map((entry) => entry.content).join(" | ");
}

export function groupByEmployeeId<T extends { employee_id: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.employee_id) ?? [];
    list.push(row);
    map.set(row.employee_id, list);
  }
  return map;
}

export function buildTeamDailyReportMember(
  employee: EmployeeWithRelations,
  accomplishmentsByEmployee: Map<string, EmployeeAccomplishment[]>,
  attendanceByEmployee: Map<string, EmployeeAttendance[]>,
  latestAttendanceByEmployee: Map<string, EmployeeAttendance | null>,
  reportIsToday = true
): TeamDailyReportMember {
  const todayAccomplishments = accomplishmentsByEmployee.get(employee.id) ?? [];
  const employeeAttendance = attendanceByEmployee.get(employee.id) ?? [];
  const latestAttendance = latestAttendanceByEmployee.get(employee.id) ?? null;
  const todayTimeIn =
    employeeAttendance.find((record) => record.action === "time_in")?.created_at ?? null;
  const todayTimeOut = [...employeeAttendance]
    .reverse()
    .find((record) => record.action === "time_out")?.created_at ?? null;

  const lastDayAction =
    employeeAttendance.length > 0
      ? employeeAttendance[employeeAttendance.length - 1]
      : null;
  const isClockedIn = reportIsToday
    ? latestAttendance?.action === "time_in"
    : lastDayAction?.action === "time_in";

  return {
    employee,
    todayAccomplishments,
    todayDutySummary: buildTodayDutySummary(todayAccomplishments),
    todayTimeIn,
    todayTimeOut,
    isClockedIn,
  };
}

export function buildTeamSummary(members: TeamDailyReportMember[]): TeamDailyReportSummary {
  return {
    totalMembers: members.length,
    deployed: members.filter((member) => member.employee.status?.name === "Deployed").length,
    onStandby: members.filter((member) => member.employee.status?.name === "On Standby").length,
    onLeave: members.filter((member) => member.employee.status?.name === "On Leave").length,
    clockedInNow: members.filter((member) => member.isClockedIn).length,
    withActivityToday: members.filter((member) => member.todayAccomplishments.length > 0).length,
  };
}

export async function fetchMemberReportMaps(employeeIds: string[], start: string, end: string) {
  if (employeeIds.length === 0) {
    return {
      accomplishmentsByEmployee: new Map<string, EmployeeAccomplishment[]>(),
      attendanceByEmployee: new Map<string, EmployeeAttendance[]>(),
      latestAttendanceByEmployee: new Map<string, EmployeeAttendance | null>(),
    };
  }

  const service = createServiceClient();
  const [accomplishmentsRes, attendanceRes, latestAttendanceRes] = await Promise.all([
    service
      .from("employee_accomplishments")
      .select("*")
      .in("employee_id", employeeIds)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false }),
    service
      .from("employee_attendance")
      .select("*")
      .in("employee_id", employeeIds)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true }),
    service
      .from("employee_attendance")
      .select("*")
      .in("employee_id", employeeIds)
      .order("created_at", { ascending: false }),
  ]);

  const accomplishmentsByEmployee = groupByEmployeeId(
    (accomplishmentsRes.data ?? []) as EmployeeAccomplishment[]
  );
  const attendanceByEmployee = groupByEmployeeId(
    (attendanceRes.data ?? []) as EmployeeAttendance[]
  );

  const latestAttendanceByEmployee = new Map<string, EmployeeAttendance | null>();
  for (const record of (latestAttendanceRes.data ?? []) as EmployeeAttendance[]) {
    if (!latestAttendanceByEmployee.has(record.employee_id)) {
      latestAttendanceByEmployee.set(record.employee_id, record);
    }
  }

  return {
    accomplishmentsByEmployee,
    attendanceByEmployee,
    latestAttendanceByEmployee,
  };
}

export function buildMemberReports(
  employees: EmployeeWithRelations[],
  accomplishmentsByEmployee: Map<string, EmployeeAccomplishment[]>,
  attendanceByEmployee: Map<string, EmployeeAttendance[]>,
  latestAttendanceByEmployee: Map<string, EmployeeAttendance | null>,
  reportIsToday = true
): TeamDailyReportMember[] {
  return employees.map((employee) =>
    buildTeamDailyReportMember(
      employee,
      accomplishmentsByEmployee,
      attendanceByEmployee,
      latestAttendanceByEmployee,
      reportIsToday
    )
  );
}
