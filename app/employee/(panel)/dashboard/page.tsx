import { redirect } from "next/navigation";
import { EmployeeAttendancePanel } from "@/components/employee/EmployeeAttendancePanel";
import { EmployeeAccomplishmentPanel } from "@/components/employee/EmployeeAccomplishmentPanel";
import { EmployeeStatusForm } from "@/components/employee/EmployeeStatusForm";
import { getMyAttendance, getMyAttendanceStatus } from "@/lib/actions/attendance";
import { getMyAccomplishments } from "@/lib/actions/accomplishments";
import {
  getMyEmployee,
  getMyUpdateLogs,
  getRegionsForEmployee,
  getSpecializationsForEmployee,
} from "@/lib/actions/employee-portal";

export const dynamic = "force-dynamic";

export default async function EmployeeDashboardPage() {
  const [employee, specializations, regions, logs, attendanceStatus, attendance, accomplishments] =
    await Promise.all([
      getMyEmployee(),
      getSpecializationsForEmployee(),
      getRegionsForEmployee(),
      getMyUpdateLogs(),
      getMyAttendanceStatus(),
      getMyAttendance(),
      getMyAccomplishments(),
    ]);

  if (!employee) {
    redirect("/employee/login");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="gov-section-title">My Employee Account</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Update your profile first, then record time in/out and submit accomplishments. Deployment status is managed by your administrator.
        </p>
      </div>
      <EmployeeStatusForm
        employee={employee}
        specializations={specializations}
        regions={regions}
        logs={logs}
      />
      <EmployeeAttendancePanel status={attendanceStatus} records={attendance} />
      <EmployeeAccomplishmentPanel records={accomplishments} />
    </div>
  );
}
