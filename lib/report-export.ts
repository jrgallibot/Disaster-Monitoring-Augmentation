import type { AdminDashboardData } from "@/lib/types";
import { formatDate, getFullName } from "@/lib/utils";

function escapeCsv(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadAdminReportExcel(data: AdminDashboardData) {
  const { stats, extended, employees } = data;
  const generated = formatDate(data.generatedAt);

  const rows: (string | number)[][] = [
    ["DSWD Augmented Employee Monitoring System"],
    ["Caraga Region XIII - Admin Report"],
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
