"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { TablePagination } from "@/components/shared/TablePagination";
import { formatCoordinates, hasValidCoordinates } from "@/lib/geo";
import { paginate } from "@/lib/pagination";
import { formatTime, getFullName } from "@/lib/utils";
import { formatSexLabel } from "@/lib/sex-stats";
import type { TeamDailyReportMember } from "@/lib/types";

interface OperationsReportMembersTableProps {
  members: TeamDailyReportMember[];
  leaderRow?: TeamDailyReportMember | null;
  showAttendance?: boolean;
  showDutyColumn?: boolean;
  dutyColumnLabel?: string;
  emptyMessage?: string;
  membersPerPage?: number;
}

function ReportMemberRow({
  member,
  index,
  isLeader = false,
  showAttendance,
  showDutyColumn,
}: {
  member: TeamDailyReportMember;
  index: number;
  isLeader?: boolean;
  showAttendance: boolean;
  showDutyColumn: boolean;
}) {
  const employee = member.employee;
  const memberName = getFullName(employee.first_name, employee.last_name, employee.middle_name);

  return (
    <tr
      className={`border-t border-dswd-border align-top ${isLeader ? "bg-dswd-light/70" : ""}`}
    >
      <td className="p-3 text-muted-foreground">{index + 1}</td>
      <td className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-dswd-navy">{memberName}</p>
          {isLeader && (
            <Badge color="#1E40AF" className="text-[10px] px-2 py-0">
              Team Leader
            </Badge>
          )}
        </div>
        <p className="text-xs font-mono text-muted-foreground">{employee.employee_id}</p>
      </td>
      <td className="p-3">{formatSexLabel(employee.sex)}</td>
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
      <td className="p-3 whitespace-pre-wrap">{employee.deployment_remarks ?? "—"}</td>
      {showDutyColumn && (
        <td className="p-3 whitespace-pre-wrap">{member.todayDutySummary}</td>
      )}
      {showAttendance && (
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
      )}
    </tr>
  );
}

export function OperationsReportMembersTable({
  members,
  leaderRow = null,
  showAttendance = true,
  showDutyColumn = true,
  dutyColumnLabel = "Actual Duty / Accomplishments Today",
  emptyMessage = "No team members assigned.",
  membersPerPage = 10,
}: OperationsReportMembersTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(membersPerPage);

  const memberRows = useMemo(() => {
    const rows: TeamDailyReportMember[] = [];
    for (const member of members) {
      if (leaderRow && member.employee.id === leaderRow.employee.id) continue;
      rows.push(member);
    }
    return rows;
  }, [members, leaderRow]);

  useEffect(() => {
    setPage(1);
  }, [memberRows, leaderRow]);

  const pagination = paginate(memberRows, page, pageSize);
  const pagedMembers = pagination.items;
  const leaderIndexOffset = leaderRow ? 1 : 0;
  const memberRowOffset = leaderIndexOffset + (page - 1) * pageSize;

  if (!leaderRow && memberRows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-0">
      <div className="overflow-x-auto rounded-lg border border-dswd-border">
        <table className="w-full text-sm">
          <thead className="bg-dswd-light">
            <tr>
              <th className="text-left p-3 font-semibold text-dswd-navy">#</th>
              <th className="text-left p-3 font-semibold text-dswd-navy">Personnel</th>
              <th className="text-left p-3 font-semibold text-dswd-navy">Sex</th>
              <th className="text-left p-3 font-semibold text-dswd-navy">Specialization</th>
              <th className="text-left p-3 font-semibold text-dswd-navy">Status</th>
              <th className="text-left p-3 font-semibold text-dswd-navy min-w-[160px]">
                Actual Task
              </th>
              <th className="text-left p-3 font-semibold text-dswd-navy min-w-[140px]">
                Deployment Location
              </th>
              <th className="text-left p-3 font-semibold text-dswd-navy min-w-[160px]">
                Remarks
              </th>
              {showDutyColumn && (
                <th className="text-left p-3 font-semibold text-dswd-navy min-w-[200px]">
                  {dutyColumnLabel}
                </th>
              )}
              {showAttendance && (
                <th className="text-left p-3 font-semibold text-dswd-navy">Attendance</th>
              )}
            </tr>
          </thead>
          <tbody>
            {leaderRow && (
              <ReportMemberRow
                key={leaderRow.employee.id}
                member={leaderRow}
                index={0}
                isLeader
                showAttendance={showAttendance}
                showDutyColumn={showDutyColumn}
              />
            )}
            {pagedMembers.map((member, index) => (
              <ReportMemberRow
                key={member.employee.id}
                member={member}
                index={memberRowOffset + index}
                showAttendance={showAttendance}
                showDutyColumn={showDutyColumn}
              />
            ))}
          </tbody>
        </table>
      </div>

      {memberRows.length > 0 && pagination.totalPages > 1 && (
        <TablePagination
          className="print:hidden px-1"
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          pageSizeOptions={[10, 20, 50]}
          itemLabel="members"
        />
      )}
    </div>
  );
}
