import type { AdminDashboardData, AdminOperationsReportData, MobilizationReportData, TeamDailyReportData } from "@/lib/types";
import { SYSTEM_NAME, CREATED_BY } from "@/lib/branding";
import { formatCoordinates, hasValidCoordinates } from "@/lib/geo";
import { formatMobilizationDate, getMobilizationStatusLabel } from "@/lib/mobilization";
import { formatDate, formatTime, getEmployeeTeamLeader, getFullName } from "@/lib/utils";

function escapeCsv(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadAdminReportExcel(data: AdminDashboardData) {
  const { stats, extended, employees } = data;
  const generated = formatDate(data.generatedAt);

  const rows: (string | number)[][] = [
    [SYSTEM_NAME],
    ["Admin Report"],
    ["Developed by", CREATED_BY],
    ["Generated", generated],
    [],
    ["SUMMARY METRICS"],
    ["Total Employees", stats.total],
    ["Deployed", stats.deployed],
    ["On Standby", stats.onStandby],
    ["On Leave", stats.onLeave],
    ["Currently Timed In", extended.clockedIn],
    ["Today's Time In", extended.todayTimeIn],
    ["Today's Time Out", extended.todayTimeOut],
    ["With Profile Photo", extended.withPhoto],
    ["With GPS Location", extended.withGps],
    ["Registered Portal Accounts", extended.registeredAccounts],
    ["Deployment Rate (%)", extended.deploymentRate],
    [],
    ["STATUS BREAKDOWN"],
    ["Status", "Count"],
    ...stats.byStatus.map((s) => [s.name, s.count]),
    [],
    ["REGION BREAKDOWN"],
    ["Region Code", "Region Name", "Count"],
    ...stats.byRegion.map((r) => [r.code, r.name, r.count]),
    [],
    ["EMPLOYEE ROSTER"],
    [
      "Employee ID",
      "Last Name",
      "First Name",
      "Middle Name",
      "Email",
      "Phone",
      "Specialization",
      "Region",
      "Status",
      "Team Leader",
      "Actual Task",
      "Deployment Location",
      "Last Latitude",
      "Last Longitude",
      "Has Photo",
      "Portal Registered",
      "Last Updated",
    ],
    ...employees.map((e) => [
      e.employee_id,
      e.last_name,
      e.first_name,
      e.middle_name ?? "",
      e.email ?? "",
      e.phone ?? "",
      e.specialization?.name ?? "",
      e.region ? `${e.region.name} (${e.region.code})` : "",
      e.status?.name ?? "",
      getEmployeeTeamLeader(e) ?? "",
      e.actual_task ?? "",
      e.deployment_location ?? "",
      e.last_latitude ?? "",
      e.last_longitude ?? "",
      e.photo_url ? "Yes" : "No",
      e.user_id ? "Yes" : "No",
      formatDate(e.updated_at),
    ]),
  ];

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `dswd-employee-report-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function printAdminReport() {
  window.print();
}

export function getEmployeeExportName(employee: AdminDashboardData["employees"][0]) {
  return getFullName(employee.first_name, employee.last_name, employee.middle_name);
}

function getTeamLeaderReportName(data: TeamDailyReportData) {
  return getFullName(
    data.teamLeader.first_name,
    data.teamLeader.last_name,
    data.teamLeader.middle_name
  );
}

export function downloadTeamDailyReportExcel(data: TeamDailyReportData) {
  const regionLabel = data.ledRegions.map((region) => region.code).join(", ");
  const leaderName = getTeamLeaderReportName(data);
  const generated = formatDate(data.generatedAt);

  const rows: (string | number)[][] = [
    [SYSTEM_NAME],
    ["Daily Team Report", data.scopeLabel],
    ["Developed by", CREATED_BY],
    ["Report Date", data.reportDate],
    ["Scope", data.scopeLabel],
    ["Generated", generated],
    ["Team Leader", leaderName],
    ["Team Leader ID", data.teamLeader.employee_id],
    ["Region", regionLabel],
    [],
    ["SUMMARY"],
    ["Total Team Members", data.summary.totalMembers],
    ["Deployed", data.summary.deployed],
    ["On Standby", data.summary.onStandby],
    ["On Leave", data.summary.onLeave],
    ["Clocked In Now", data.summary.clockedInNow],
    ["With Activity Today", data.summary.withActivityToday],
    [],
    ["TEAM MEMBER DAILY STATUS"],
    [
      "No.",
      "Employee ID",
      "Name",
      "Specialization",
      "Deployment Status",
      "Actual Task",
      "Deployment Location",
      "Actual Duty Today",
      "Time In Today",
      "Time Out Today",
      "Clocked In Now",
      "Phone",
      "Last GPS",
    ],
    ...data.members.map((member, index) => {
      const employee = member.employee;
      const gps =
        hasValidCoordinates(employee.last_latitude, employee.last_longitude)
          ? formatCoordinates(employee.last_latitude, employee.last_longitude)
          : "";

      return [
        index + 1,
        employee.employee_id,
        getFullName(employee.first_name, employee.last_name, employee.middle_name),
        employee.specialization?.name ?? "",
        employee.status?.name ?? "",
        employee.actual_task ?? "",
        employee.deployment_location ?? "",
        member.todayDutySummary,
        member.todayTimeIn ? formatTime(member.todayTimeIn) : "",
        member.todayTimeOut ? formatTime(member.todayTimeOut) : "",
        member.isClockedIn ? "Yes" : "No",
        employee.phone ?? "",
        gps,
      ];
    }),
  ];

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = data.reportDateKey;
  const regionSlug = regionLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  link.href = url;
  link.download = `dswd-team-daily-report-${regionSlug}-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function printTeamDailyReport() {
  window.print();
}

function memberReportRow(
  member: TeamDailyReportData["members"][0],
  index: number,
  teamLeaderName: string,
  regionLabel: string
): (string | number)[] {
  const employee = member.employee;
  const gps =
    hasValidCoordinates(employee.last_latitude, employee.last_longitude)
      ? formatCoordinates(employee.last_latitude, employee.last_longitude)
      : "";

  return [
    index + 1,
    regionLabel,
    teamLeaderName,
    employee.employee_id,
    getFullName(employee.first_name, employee.last_name, employee.middle_name),
    employee.specialization?.name ?? "",
    employee.status?.name ?? "",
    employee.actual_task ?? "",
    employee.deployment_location ?? "",
    member.todayDutySummary,
    member.todayTimeIn ? formatTime(member.todayTimeIn) : "",
    member.todayTimeOut ? formatTime(member.todayTimeOut) : "",
    member.isClockedIn ? "Yes" : "No",
    employee.phone ?? "",
    gps,
  ];
}

export function downloadAdminOperationsReportExcel(data: AdminOperationsReportData) {
  const generated = formatDate(data.generatedAt);

  const rows: (string | number)[][] = [
    [SYSTEM_NAME],
    ["Daily Operations Report", data.scopeLabel],
    ["Developed by", CREATED_BY],
    ["Report Date", data.reportDate],
    ["Scope", data.scopeLabel],
    ["Generated", generated],
    [],
    ["GLOBAL SUMMARY"],
    ["Team Leaders", data.summary.totalTeamLeaders],
    ["Team Members", data.summary.totalMembers],
    ["Deployed", data.summary.deployed],
    ["On Standby", data.summary.onStandby],
    ["On Leave", data.summary.onLeave],
    ["Clocked In Now", data.summary.clockedInNow],
    ["With Activity Today", data.summary.withActivityToday],
  ];

  for (const team of data.teams) {
    const leaderName = getFullName(
      team.teamLeader.first_name,
      team.teamLeader.last_name,
      team.teamLeader.middle_name
    );
    const regionLabel = `${team.region.name} (${team.region.code})`;

    rows.push([]);
    rows.push(["TEAM LEADER REPORT"]);
    rows.push(["Region", regionLabel]);
    rows.push(["Team Leader", leaderName]);
    rows.push(["Team Leader ID", team.teamLeader.employee_id]);
    rows.push(["Team Leader Activity Today", team.leaderActivity.todayDutySummary]);
    rows.push(["Members", team.summary.totalMembers]);
    rows.push(["Deployed", team.summary.deployed]);
    rows.push(["On Standby", team.summary.onStandby]);
    rows.push(["On Leave", team.summary.onLeave]);
    rows.push(["Clocked In Now", team.summary.clockedInNow]);
    rows.push(["With Activity Today", team.summary.withActivityToday]);
    rows.push([]);
    rows.push([
      "No.",
      "Region",
      "Team Leader",
      "Employee ID",
      "Name",
      "Specialization",
      "Deployment Status",
      "Actual Task",
      "Deployment Location",
      "Actual Duty / Accomplishments Today",
      "Time In Today",
      "Time Out Today",
      "Clocked In Now",
      "Phone",
      "Last GPS",
    ]);

    team.members.forEach((member, index) => {
      rows.push(memberReportRow(member, index, leaderName, regionLabel));
    });
  }

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = data.reportDateKey;
  link.href = url;
  link.download = `dswd-admin-operations-report-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function printAdminOperationsReport() {
  window.print();
}

export function downloadMobilizationReportExcel(data: MobilizationReportData) {
  const generated = formatDate(data.generatedAt);

  const rows: (string | number)[][] = [
    [SYSTEM_NAME],
    ["Mobilization Report", data.scopeLabel],
    ["Developed by", CREATED_BY],
    ["Date From", formatMobilizationDate(data.dateFrom)],
    ["Date To", formatMobilizationDate(data.dateTo)],
    ["Scope", data.scopeLabel],
    ["Generated", generated],
    [],
    ["SUMMARY"],
    ["In Date Range", data.summary.totalInRange],
    ["Mobilized Now", data.summary.mobilizedNow],
    ["Demobilized Now", data.summary.demobilizedNow],
    [],
    ["PERSONNEL"],
    [
      "No.",
      "Employee ID",
      "Name",
      "Region",
      "Specialization",
      "Team Leader",
      "Augmentation Status",
      "Mobilized Date",
      "Demobilized Date",
      "Duration (days)",
    ],
    ...data.rows.map((row, index) => {
      const employee = row.employee;
      return [
        index + 1,
        employee.employee_id,
        getFullName(employee.first_name, employee.last_name, employee.middle_name),
        employee.region ? `${employee.region.name} (${employee.region.code})` : "",
        employee.specialization?.name ?? "",
        getEmployeeTeamLeader(employee) ?? "",
        getMobilizationStatusLabel(employee.mobilization_status ?? "mobilized"),
        formatMobilizationDate(employee.mobilized_at),
        formatMobilizationDate(employee.demobilized_at),
        row.durationDays ?? "",
      ];
    }),
  ];

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = `${data.dateFrom}_to_${data.dateTo}`;
  link.href = url;
  link.download = `dswd-mobilization-report-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function printMobilizationReport() {
  window.print();
}
