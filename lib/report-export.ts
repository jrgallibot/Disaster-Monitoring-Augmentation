import type { AdminDashboardData, AdminOperationsReportData, MobilizationReportData, TeamDailyReportData } from "@/lib/types";
import { SYSTEM_NAME, CREATED_BY } from "@/lib/branding";
import { formatCoordinates, hasValidCoordinates } from "@/lib/geo";
import { formatMobilizationDate, getMobilizationStatusLabel } from "@/lib/mobilization";
import { formatDate, formatTime, getEmployeeTeamLeader, getFullName, getTeamLeaderDisplay } from "@/lib/utils";
import { countSex, formatSexLabel } from "@/lib/sex-stats";

function escapeCsv(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadAdminReportExcel(data: AdminDashboardData) {
  const { stats, extended, employees, regionTeams } = data;
  const generated = formatDate(data.generatedAt);
  const monitoredMembers = regionTeams.flatMap((team) => team.members);
  const uniqueMonitoredMembers = Array.from(
    new Map(monitoredMembers.map((member) => [member.id, member])).values()
  );
  const monitoredSex = countSex(uniqueMonitoredMembers);

  const rows: (string | number)[][] = [
    [SYSTEM_NAME],
    ["Admin Report"],
    ["Developed by", CREATED_BY],
    ["Generated", generated],
    [],
    ["SUMMARY METRICS"],
    ["Total Employees", stats.total, `M: ${stats.sex.total.male}`, `F: ${stats.sex.total.female}`],
    ["Deployed", stats.deployed, `M: ${stats.sex.deployed.male}`, `F: ${stats.sex.deployed.female}`],
    ["On Standby", stats.onStandby, `M: ${stats.sex.onStandby.male}`, `F: ${stats.sex.onStandby.female}`],
    ["On Leave", stats.onLeave, `M: ${stats.sex.onLeave.male}`, `F: ${stats.sex.onLeave.female}`],
    ["Currently Timed In", extended.clockedIn, `M: ${extended.sex.clockedIn.male}`, `F: ${extended.sex.clockedIn.female}`],
    ["Today's Time In", extended.todayTimeIn, `M: ${extended.sex.todayTimeIn.male}`, `F: ${extended.sex.todayTimeIn.female}`],
    ["Today's Time Out", extended.todayTimeOut, `M: ${extended.sex.todayTimeOut.male}`, `F: ${extended.sex.todayTimeOut.female}`],
    ["With Profile Photo", extended.withPhoto, `M: ${extended.sex.withPhoto.male}`, `F: ${extended.sex.withPhoto.female}`],
    ["With GPS Location", extended.withGps, `M: ${extended.sex.withGps.male}`, `F: ${extended.sex.withGps.female}`],
    ["Registered Portal Accounts", extended.registeredAccounts, `M: ${extended.sex.registeredAccounts.male}`, `F: ${extended.sex.registeredAccounts.female}`],
    ["Deployment Rate (%)", extended.deploymentRate],
    [],
    ["TEAM LEADER MONITORING SUMMARY"],
    ["Team Leaders", regionTeams.length],
    [
      "Assigned Team Members",
      uniqueMonitoredMembers.length,
      `M: ${monitoredSex.male}`,
      `F: ${monitoredSex.female}`,
    ],
    [],
    ["TEAM LEADER BREAKDOWN"],
    ["Team Leader", "Employee ID", "Region", "Assigned Members", "Male", "Female"],
    ...regionTeams.map(({ region, teamLeader, members }) => {
      const memberSex = countSex(members);
      return [
        getTeamLeaderDisplay(teamLeader) ?? "",
        teamLeader.employee_id,
        `${region.name} (${region.code})`,
        members.length,
        memberSex.male,
        memberSex.female,
      ];
    }),
    [],
    ["STATUS BREAKDOWN"],
    ["Status", "Total", "Male", "Female"],
    ...stats.byStatus.map((s) => [s.name, s.count, s.male, s.female]),
    [],
    ["REGION BREAKDOWN"],
    ["Region Code", "Region Name", "Total", "Male", "Female"],
    ...stats.byRegion.map((r) => [r.code, r.name, r.count, r.male, r.female]),
    [],
    ["SPECIALIZATION BREAKDOWN"],
    ["Specialization", "Total", "Male", "Female"],
    ...data.bySpecialization.map((s) => [s.name, s.count, s.male, s.female]),
    [],
    ["EMPLOYEE ROSTER"],
    [
      "Employee ID",
      "Last Name",
      "First Name",
      "Middle Name",
      "Sex",
      "Email",
      "Phone",
      "Specialization",
      "Region",
      "Status",
      "Team Leader",
      "Actual Task",
      "Deployment Location",
      "Remarks",
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
      e.sex ?? "",
      e.email ?? "",
      e.phone ?? "",
      e.specialization?.name ?? "",
      e.region ? `${e.region.name} (${e.region.code})` : "",
      e.status?.name ?? "",
      getEmployeeTeamLeader(e) ?? "",
      e.actual_task ?? "",
      e.deployment_location ?? "",
      e.deployment_remarks ?? "",
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
  link.download = `qrt-employee-report-${stamp}.csv`;
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

function teamDailyReportPersonRow(
  member: TeamDailyReportData["members"][0],
  index: number,
  roleLabel: string
): (string | number)[] {
  const employee = member.employee;

  return [
    index + 1,
    roleLabel,
    employee.employee_id,
    getFullName(employee.first_name, employee.last_name, employee.middle_name),
    formatSexLabel(employee.sex),
    employee.specialization?.name ?? "",
    employee.status?.name ?? "",
    employee.actual_task ?? "",
    employee.deployment_location ?? "",
    employee.deployment_remarks ?? "",
  ];
}

export function downloadTeamDailyReportExcel(data: TeamDailyReportData) {
  const regionLabel = data.ledRegions.map((region) => region.code).join(", ");
  const leaderName = getTeamLeaderReportName(data);
  const generated = formatDate(data.generatedAt);

  const personnelRows: (string | number)[][] = [
    teamDailyReportPersonRow(data.leaderActivity, 0, "Team Leader"),
    ...data.members
      .filter((member) => member.employee.id !== data.teamLeader.id)
      .map((member, index) => teamDailyReportPersonRow(member, index + 1, "Team Member")),
  ];

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
    ["SUMMARY (Team Members)"],
    ["Total Team Members", data.summary.totalMembers, `M: ${data.summary.sex.totalMembers.male}`, `F: ${data.summary.sex.totalMembers.female}`],
    ["Deployed", data.summary.deployed, `M: ${data.summary.sex.deployed.male}`, `F: ${data.summary.sex.deployed.female}`],
    ["On Standby", data.summary.onStandby, `M: ${data.summary.sex.onStandby.male}`, `F: ${data.summary.sex.onStandby.female}`],
    ["On Leave", data.summary.onLeave, `M: ${data.summary.sex.onLeave.male}`, `F: ${data.summary.sex.onLeave.female}`],
    ["Clocked In Now", data.summary.clockedInNow, `M: ${data.summary.sex.clockedInNow.male}`, `F: ${data.summary.sex.clockedInNow.female}`],
    ["With Activity Today", data.summary.withActivityToday, `M: ${data.summary.sex.withActivityToday.male}`, `F: ${data.summary.sex.withActivityToday.female}`],
    [],
    ["TEAM DAILY STATUS (Team Leader + Members)"],
    [
      "No.",
      "Role",
      "Employee ID",
      "Name",
      "Sex",
      "Specialization",
      "Deployment Status",
      "Actual Task",
      "Deployment Location",
      "Remarks",
    ],
    ...personnelRows,
  ];

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = data.reportDateKey;
  const regionSlug = regionLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  link.href = url;
  link.download = `qrt-team-daily-report-${regionSlug}-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function printTeamDailyReport() {
  window.print();
}

function adminOperationsPersonRow(
  member: TeamDailyReportData["members"][0],
  index: number,
  roleLabel: string,
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
    roleLabel,
    regionLabel,
    teamLeaderName,
    employee.employee_id,
    getFullName(employee.first_name, employee.last_name, employee.middle_name),
    formatSexLabel(employee.sex),
    employee.specialization?.name ?? "",
    employee.status?.name ?? "",
    employee.actual_task ?? "",
    employee.deployment_location ?? "",
    employee.deployment_remarks ?? "",
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
    ["Team Members", data.summary.totalMembers, `M: ${data.summary.sex.totalMembers.male}`, `F: ${data.summary.sex.totalMembers.female}`],
    ["Deployed", data.summary.deployed, `M: ${data.summary.sex.deployed.male}`, `F: ${data.summary.sex.deployed.female}`],
    ["On Standby", data.summary.onStandby, `M: ${data.summary.sex.onStandby.male}`, `F: ${data.summary.sex.onStandby.female}`],
    ["On Leave", data.summary.onLeave, `M: ${data.summary.sex.onLeave.male}`, `F: ${data.summary.sex.onLeave.female}`],
    ["Clocked In Now", data.summary.clockedInNow, `M: ${data.summary.sex.clockedInNow.male}`, `F: ${data.summary.sex.clockedInNow.female}`],
    ["With Activity Today", data.summary.withActivityToday, `M: ${data.summary.sex.withActivityToday.male}`, `F: ${data.summary.sex.withActivityToday.female}`],
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
    rows.push(["Members", team.summary.totalMembers, `M: ${team.summary.sex.totalMembers.male}`, `F: ${team.summary.sex.totalMembers.female}`]);
    rows.push(["Deployed", team.summary.deployed, `M: ${team.summary.sex.deployed.male}`, `F: ${team.summary.sex.deployed.female}`]);
    rows.push(["On Standby", team.summary.onStandby, `M: ${team.summary.sex.onStandby.male}`, `F: ${team.summary.sex.onStandby.female}`]);
    rows.push(["On Leave", team.summary.onLeave, `M: ${team.summary.sex.onLeave.male}`, `F: ${team.summary.sex.onLeave.female}`]);
    rows.push(["Clocked In Now", team.summary.clockedInNow, `M: ${team.summary.sex.clockedInNow.male}`, `F: ${team.summary.sex.clockedInNow.female}`]);
    rows.push(["With Activity Today", team.summary.withActivityToday, `M: ${team.summary.sex.withActivityToday.male}`, `F: ${team.summary.sex.withActivityToday.female}`]);
    rows.push([]);
    rows.push([
      "No.",
      "Role",
      "Region",
      "Team Leader",
      "Employee ID",
      "Name",
      "Sex",
      "Specialization",
      "Deployment Status",
      "Actual Task",
      "Deployment Location",
      "Remarks",
      "Accomplishments",
      "Time In Today",
      "Time Out Today",
      "Clocked In Now",
      "Phone",
      "Last GPS",
    ]);

    const personnelRows = [
      adminOperationsPersonRow(team.leaderActivity, 0, "Team Leader", leaderName, regionLabel),
      ...team.members
        .filter((member) => member.employee.id !== team.teamLeader.id)
        .map((member, index) =>
          adminOperationsPersonRow(member, index + 1, "Team Member", leaderName, regionLabel)
        ),
    ];

    rows.push(...personnelRows);
  }

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = data.reportDateKey;
  link.href = url;
  link.download = `qrt-admin-operations-report-${stamp}.csv`;
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
    ["In Date Range", data.summary.totalInRange, `M: ${data.summary.sex.totalInRange.male}`, `F: ${data.summary.sex.totalInRange.female}`],
    ["Mobilized Now", data.summary.mobilizedNow, `M: ${data.summary.sex.mobilizedNow.male}`, `F: ${data.summary.sex.mobilizedNow.female}`],
    ["Demobilized Now", data.summary.demobilizedNow, `M: ${data.summary.sex.demobilizedNow.male}`, `F: ${data.summary.sex.demobilizedNow.female}`],
    [],
    ["PERSONNEL"],
    [
      "No.",
      "Employee ID",
      "Name",
      "Sex",
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
        formatSexLabel(employee.sex),
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
  link.download = `qrt-mobilization-report-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function printMobilizationReport() {
  window.print();
}
