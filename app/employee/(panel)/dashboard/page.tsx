import { redirect } from "next/navigation";
import { EmployeeAttendancePanel } from "@/components/employee/EmployeeAttendancePanel";
import { EmployeeStatusForm } from "@/components/employee/EmployeeStatusForm";
import { getMyAttendance, getMyAttendanceStatus } from "@/lib/actions/attendance";
import {
  getMyEmployee,
  getMyUpdateLogs,
  getRegionsForEmployee,
  getSpecializationsForEmployee,
  getStatusesForEmployee,
} from "@/lib/actions/employee-portal";

export const dynamic = "force-dynamic";

export default async function EmployeeDashboardPage() {
  const [employee, statuses, specializations, regions, logs, attendanceStatus, attendance] =
    await Promise.all([
      getMyEmployee(),
      getStatusesForEmployee(),
      getSpecializationsForEmployee(),
      getRegionsForEmployee(),
      getMyUpdateLogs(),
      getMyAttendanceStatus(),
      getMyAttendance(),
    ]);

  if (!employee) {
    redirect("/employee/login");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="gov-section-title">My Employee Account</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Time in/out, update your profile, and keep deployment details current for monitoring.
        </p>
      </div>
      <EmployeeAttendancePanel status={attendanceStatus} records={attendance} />
      <EmployeeStatusForm
        employee={employee}
        statuses={statuses}
        specializations={specializations}
        regions={regions}
        logs={logs}
      />
    </div>
  );
}
