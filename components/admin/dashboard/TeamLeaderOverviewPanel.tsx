"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminEmployeeHistoryDialog } from "@/components/admin/AdminEmployeeHistoryDialog";
import { EmployeeAvatar } from "@/components/shared/EmployeeAvatar";
import { TablePagination } from "@/components/shared/TablePagination";
import { getFullName, getTeamLeaderDisplay } from "@/lib/utils";
import { paginate } from "@/lib/pagination";
import { SexBreakdown } from "@/components/shared/SexBreakdown";
import { countSex } from "@/lib/sex-stats";
import type { EmployeeWithRelations, LibraryStatus, RegionTeamOverview } from "@/lib/types";
import { BookOpen, History, Users, UserCog } from "lucide-react";

interface TeamLeaderOverviewPanelProps {
  regionTeams: RegionTeamOverview[];
  statuses: LibraryStatus[];
  /** Public dashboard: view-only links, no admin history dialog */
  publicView?: boolean;
  regionsPerPage?: number;
}

export function TeamLeaderOverviewPanel({
  regionTeams,
  statuses,
  publicView = false,
  regionsPerPage = 3,
}: TeamLeaderOverviewPanelProps) {
  const [historyEmployee, setHistoryEmployee] = useState<EmployeeWithRelations | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [regionTeams]);

  const teamPagination = paginate(regionTeams, page, regionsPerPage);
  const pagedTeams = teamPagination.items;

  function memberHref(id: string) {
    return publicView ? `/employees/${id}` : `/admin/employees/${id}/edit`;
  }

  const assignedCount = regionTeams.length;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-dswd-navy" />
              Regional Team Leaders &amp; Monitored Members
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {assignedCount} team leader{assignedCount === 1 ? "" : "s"} ·{" "}
              {regionTeams.reduce((total, team) => total + team.members.length, 0)} monitored member
              {regionTeams.reduce((total, team) => total + team.members.length, 0) === 1 ? "" : "s"}
            </p>
          </div>
          {!publicView && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/libraries">
                <BookOpen className="h-4 w-4" />
                Manage Team Leaders
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {regionTeams.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No regional team data yet.</p>
              <p className="text-sm mt-1">
                Assign team leaders under Admin → Libraries → Regions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pagedTeams.map(({ region, teamLeader, members }) => (
                <div
                  key={`${region.id}-${teamLeader.id}`}
                  className="border border-dswd-border rounded-lg overflow-hidden"
                >
                  <div className="bg-dswd-light px-4 py-3 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-dswd-navy uppercase tracking-wide">
                          Team Leader
                        </p>
                        <Link
                          href={memberHref(teamLeader.id)}
                          className="font-semibold text-dswd-navy hover:text-dswd-blue hover:underline mt-0.5 inline-block"
                        >
                          {getTeamLeaderDisplay(teamLeader)}
                        </Link>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {region.name}{" "}
                          <span className="font-normal">({region.code})</span>
                          {teamLeader.user_id && (
                            <span className="text-green-700 ml-2">Portal active</span>
                          )}
                        </p>
                      </div>
                      <Badge variant="outline" className="w-fit shrink-0">
                        {members.length} monitored member{members.length === 1 ? "" : "s"}
                      </Badge>
                      <SexBreakdown count={countSex(members)} />
                    </div>
                  </div>

                  {members.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-muted-foreground">
                      No employees assigned to this team leader yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-dswd-border bg-white">
                            <th className="text-left p-3 font-semibold text-dswd-navy">Member</th>
                            <th className="text-left p-3 font-semibold text-dswd-navy">Employee ID</th>
                            <th className="text-left p-3 font-semibold text-dswd-navy">Specialization</th>
                            <th className="text-left p-3 font-semibold text-dswd-navy">Status</th>
                            <th className="text-left p-3 font-semibold text-dswd-navy">Account</th>
                            <th className="text-left p-3 font-semibold text-dswd-navy">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((member) => (
                            <tr
                              key={member.id}
                              className="border-b border-dswd-border last:border-0 hover:bg-dswd-light/40"
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  <EmployeeAvatar photoUrl={member.photo_url} size={36} />
                                  {publicView ? (
                                    <Link
                                      href={memberHref(member.id)}
                                      className="font-medium text-dswd-blue hover:underline"
                                    >
                                      {getFullName(
                                        member.first_name,
                                        member.last_name,
                                        member.middle_name
                                      )}
                                    </Link>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setHistoryEmployee(member)}
                                      className="font-medium text-dswd-blue hover:underline text-left"
                                    >
                                      {getFullName(
                                        member.first_name,
                                        member.last_name,
                                        member.middle_name
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 font-mono text-xs">{member.employee_id}</td>
                              <td className="p-3 text-muted-foreground">
                                {member.specialization?.name ?? "—"}
                              </td>
                              <td className="p-3">
                                {member.status ? (
                                  <Badge color={member.status.color}>{member.status.name}</Badge>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="p-3">
                                <Badge variant={member.user_id ? "default" : "outline"}>
                                  {member.user_id ? "Registered" : "No account"}
                                </Badge>
                              </td>
                              <td className="p-3">
                                {publicView ? (
                                  <Link
                                    href={memberHref(member.id)}
                                    className="text-dswd-blue hover:underline text-xs"
                                  >
                                    View profile
                                  </Link>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setHistoryEmployee(member)}
                                    className="text-dswd-blue hover:underline text-xs inline-flex items-center gap-1"
                                  >
                                    <History className="h-3 w-3" />
                                    History
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
              <TablePagination
                page={teamPagination.page}
                pageSize={teamPagination.pageSize}
                totalItems={teamPagination.totalItems}
                onPageChange={setPage}
                itemLabel="teams"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {!publicView && (
        <AdminEmployeeHistoryDialog
          employee={historyEmployee}
          statuses={statuses}
          onClose={() => setHistoryEmployee(null)}
        />
      )}
    </>
  );
}
