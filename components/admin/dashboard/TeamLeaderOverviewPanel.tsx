"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminEmployeeHistoryDialog } from "@/components/admin/AdminEmployeeHistoryDialog";
import { EmployeeAvatar } from "@/components/shared/EmployeeAvatar";
import { getFullName, getRegionTeamLeaderSummaries, getTeamLeaderDisplay } from "@/lib/utils";
import type { EmployeeWithRelations, LibraryStatus, RegionTeamOverview } from "@/lib/types";
import { BookOpen, History, Users, UserCog } from "lucide-react";

interface TeamLeaderOverviewPanelProps {
  regionTeams: RegionTeamOverview[];
  statuses: LibraryStatus[];
}

export function TeamLeaderOverviewPanel({
  regionTeams,
  statuses,
}: TeamLeaderOverviewPanelProps) {
  const [historyEmployee, setHistoryEmployee] = useState<EmployeeWithRelations | null>(null);

  const assignedCount = regionTeams.filter(
    (item) => getRegionTeamLeaderSummaries(item.region).length > 0
  ).length;

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
              {assignedCount} region{assignedCount === 1 ? "" : "s"} with team leaders ·{" "}
              {regionTeams.length} region{regionTeams.length === 1 ? "" : "s"} shown
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/libraries">
              <BookOpen className="h-4 w-4" />
              Manage Team Leaders
            </Link>
          </Button>
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
              {regionTeams.map(({ region, members }) => {
                const regionLeaders = getRegionTeamLeaderSummaries(region);

                return (
                  <div
                    key={region.id}
                    className="border border-dswd-border rounded-lg overflow-hidden"
                  >
                    <div className="bg-dswd-light px-4 py-3 flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-dswd-navy">
                            {region.name}{" "}
                            <span className="text-muted-foreground font-normal">({region.code})</span>
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {regionLeaders.length} team leader{regionLeaders.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        <Badge variant="outline" className="w-fit shrink-0">
                          {members.length} monitored member{members.length === 1 ? "" : "s"}
                        </Badge>
                      </div>

                      {regionLeaders.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {regionLeaders.map((leader) => (
                            <Link
                              key={leader.id}
                              href={`/admin/employees/${leader.id}/edit`}
                              className="inline-flex items-center gap-2 rounded-full border border-dswd-border bg-white px-3 py-1.5 text-xs hover:bg-dswd-light"
                            >
                              <span className="font-medium text-dswd-navy">
                                {getTeamLeaderDisplay(leader)}
                              </span>
                              {leader.user_id && (
                                <span className="text-green-700">Portal active</span>
                              )}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-amber-700 font-medium">No team leaders assigned</p>
                      )}
                    </div>

                    {members.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-muted-foreground">
                        No other employees in this region yet.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-dswd-border bg-white">
                              <th className="text-left p-3 font-semibold text-dswd-navy">Member</th>
                              <th className="text-left p-3 font-semibold text-dswd-navy">Employee ID</th>
                              <th className="text-left p-3 font-semibold text-dswd-navy">Assigned Team Leader</th>
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
                                  </div>
                                </td>
                                <td className="p-3 font-mono text-xs">{member.employee_id}</td>
                                <td className="p-3 text-muted-foreground">
                                  {getTeamLeaderDisplay(member.assigned_team_leader) ??
                                    (regionLeaders.length === 1
                                      ? getTeamLeaderDisplay(regionLeaders[0])
                                      : "Not selected")}
                                </td>
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
                                  <button
                                    type="button"
                                    onClick={() => setHistoryEmployee(member)}
                                    className="text-dswd-blue hover:underline text-xs inline-flex items-center gap-1"
                                  >
                                    <History className="h-3 w-3" />
                                    History
                                  </button>
                                </td>
                              </tr>
                          ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AdminEmployeeHistoryDialog
        employee={historyEmployee}
        statuses={statuses}
        onClose={() => setHistoryEmployee(null)}
      />
    </>
  );
}
