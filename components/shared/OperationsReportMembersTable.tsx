import { Badge } from "@/components/ui/badge";
import { formatCoordinates, hasValidCoordinates } from "@/lib/geo";
import { formatTime, getFullName } from "@/lib/utils";
import type { TeamDailyReportMember } from "@/lib/types";

interface OperationsReportMembersTableProps {
  members: TeamDailyReportMember[];
  emptyMessage?: string;
}

export function OperationsReportMembersTable({
  members,
  emptyMessage = "No team members assigned.",
}: OperationsReportMembersTableProps) {
  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-dswd-border">
      <table className="w-full text-sm">
        <thead className="bg-dswd-light">
          <tr>
            <th className="text-left p-3 font-semibold text-dswd-navy">#</th>
            <th className="text-left p-3 font-semibold text-dswd-navy">Member</th>
            <th className="text-left p-3 font-semibold text-dswd-navy">Specialization</th>
            <th className="text-left p-3 font-semibold text-dswd-navy">Status</th>
            <th className="text-left p-3 font-semibold text-dswd-navy min-w-[160px]">
              Actual Task
            </th>
            <th className="text-left p-3 font-semibold text-dswd-navy min-w-[140px]">
              Deployment Location
            </th>
            <th className="text-left p-3 font-semibold text-dswd-navy min-w-[200px]">
              Actual Duty / Accomplishments Today
            </th>
            <th className="text-left p-3 font-semibold text-dswd-navy">Attendance</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member, index) => {
            const employee = member.employee;
            const memberName = getFullName(
              employee.first_name,
              employee.last_name,
              employee.middle_name
            );

            return (
              <tr key={employee.id} className="border-t border-dswd-border align-top">
                <td className="p-3 text-muted-foreground">{index + 1}</td>
                <td className="p-3">
                  <p className="font-medium text-dswd-navy">{memberName}</p>
                  <p className="text-xs font-mono text-muted-foreground">{employee.employee_id}</p>
                </td>
                <td className="p-3">{employee.specialization?.name ?? "—"}</td>
                <td className="p-3">
                  {employee.status ? (
                    <Badge color={employee.status.color}>{employee.status.name}</Badge>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3 whitespace-pre-wrap">{employee.actual_task ?? "—"}</td>
                <td className="p-3">{employee.deployment_location ?? "—"}</td>
                <td className="p-3 whitespace-pre-wrap">{member.todayDutySummary}</td>
                <td className="p-3 space-y-1">
                  <p>
                    In:{" "}
                    <span className="font-medium">
                      {member.todayTimeIn ? formatTime(member.todayTimeIn) : "—"}
                    </span>
                  </p>
                  <p>
                    Out:{" "}
                    <span className="font-medium">
                      {member.todayTimeOut ? formatTime(member.todayTimeOut) : "—"}
                    </span>
                  </p>
                  <p>
                    Now:{" "}
                    <span
                      className={
                        member.isClockedIn
                          ? "font-medium text-green-700"
                          : "font-medium text-muted-foreground"
                      }
                    >
                      {member.isClockedIn ? "Clocked In" : "Not Clocked In"}
                    </span>
                  </p>
                  {hasValidCoordinates(employee.last_latitude, employee.last_longitude) && (
                    <p className="text-xs text-muted-foreground">
                      GPS: {formatCoordinates(employee.last_latitude, employee.last_longitude)}
                    </p>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
