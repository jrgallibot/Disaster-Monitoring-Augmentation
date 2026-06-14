"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeAvatar } from "@/components/shared/EmployeeAvatar";
import { EmployeeAttendanceList } from "@/components/shared/EmployeeAttendanceList";
import { EmployeeUpdateLogList } from "@/components/shared/EmployeeUpdateLogList";
import { EmployeeDeploymentLogList } from "@/components/shared/EmployeeDeploymentLogList";
import { AdminEmployeePortalPasswordPanel } from "@/components/admin/AdminEmployeePortalPasswordPanel";
import { EmployeeAccomplishmentList } from "@/components/shared/EmployeeAccomplishmentList";
import { getEmployeeHistoryBundleForAdmin } from "@/lib/actions/employees";
import { statusRequiresDeploymentLocation } from "@/lib/deployment";
import { formatCoordinates, getMapUrl, hasValidCoordinates } from "@/lib/geo";
import { getFullName } from "@/lib/utils";
import type { EmployeeHistoryBundle, EmployeeWithRelations, LibraryStatus } from "@/lib/types";
import { Briefcase, ClipboardList, Clock, History, KeyRound, MapPin, X } from "lucide-react";

interface AdminEmployeeHistoryDialogProps {
  employee: EmployeeWithRelations | null;
  statuses: LibraryStatus[];
  onClose: () => void;
  canManagePortalPassword?: boolean;
}

export function AdminEmployeeHistoryDialog({
  employee,
  statuses,
  onClose,
  canManagePortalPassword = false,
}: AdminEmployeeHistoryDialogProps) {
  const [bundle, setBundle] = useState<EmployeeHistoryBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState("deployment");
  const employeeId = employee?.id ?? null;

  useEffect(() => {
    if (!employeeId) {
      setBundle(null);
      setLoadError(null);
      return;
    }

    startTransition(async () => {
      setLoadError(null);
      try {
        const result = await getEmployeeHistoryBundleForAdmin(employeeId);
        if (!result.success) {
          setLoadError(result.error);
          setBundle(null);
          return;
        }
        setBundle(result.bundle);
      } catch {
        setLoadError("Failed to load employee records. Please refresh and try again.");
        setBundle(null);
      }
    });
  }, [employeeId]);

  if (!employee) return null;

  const snapshot = bundle?.employee ?? employee;
  const employeeName = getFullName(
    snapshot.first_name,
    snapshot.last_name,
    snapshot.middle_name
  );
  const isClockedIn = bundle?.attendance[0]?.action === "time_in";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-dswd-border">
          <div className="flex items-center gap-4 min-w-0">
            <EmployeeAvatar photoUrl={snapshot.photo_url} size={56} />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-dswd-navy truncate">{employeeName}</h2>
              <p className="text-sm font-mono text-muted-foreground">{snapshot.employee_id}</p>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                {snapshot.status ? (
                  <Badge color={snapshot.status.color}>{snapshot.status.name}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">No deployment status</span>
                )}
                {isClockedIn && (
                  <span className="text-xs text-green-700 font-semibold">Currently Timed In</span>
                )}
              </div>
              {statusRequiresDeploymentLocation(snapshot.status?.name) && snapshot.deployment_location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {snapshot.deployment_location}
                </p>
              )}
              {hasValidCoordinates(snapshot.last_latitude, snapshot.last_longitude) && (
                <a
                  href={getMapUrl(snapshot.last_latitude, snapshot.last_longitude)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-dswd-blue hover:underline flex items-center gap-1 mt-1"
                >
                  <MapPin className="h-3 w-3" />
                  Last location: {formatCoordinates(snapshot.last_latitude, snapshot.last_longitude)}
                </a>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {isPending && (
            <p className="text-sm text-muted-foreground mb-4">Loading employee history...</p>
          )}
          {loadError && (
            <p className="text-sm text-red-600 mb-4">{loadError}</p>
          )}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 mb-4 h-auto gap-1">
              {employee.user_id && (
                <TabsTrigger value="portal" className="gap-1 text-xs sm:text-sm">
                  <KeyRound className="h-4 w-4 shrink-0" />
                  Portal
                </TabsTrigger>
              )}
              <TabsTrigger value="deployment" className="gap-1 text-xs sm:text-sm">
                <Briefcase className="h-4 w-4 shrink-0" />
                Deployment
                {bundle && (
                  <span className="text-[10px] bg-dswd-light px-1.5 rounded-full">
                    {bundle.deploymentLogs.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="updates" className="gap-1 text-xs sm:text-sm">
                <History className="h-4 w-4 shrink-0" />
                Profile
                {bundle && (
                  <span className="text-[10px] bg-dswd-light px-1.5 rounded-full">
                    {bundle.profileLogs.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="accomplishments" className="gap-1 text-xs sm:text-sm">
                <ClipboardList className="h-4 w-4 shrink-0" />
                Accomplishments
                {bundle && (
                  <span className="text-[10px] bg-dswd-light px-1.5 rounded-full">
                    {bundle.accomplishments.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="attendance" className="gap-1 text-xs sm:text-sm">
                <Clock className="h-4 w-4 shrink-0" />
                Time In/Out
                {bundle && (
                  <span className="text-[10px] bg-dswd-light px-1.5 rounded-full">
                    {bundle.attendance.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {employee.user_id && (
              <TabsContent value="portal">
                <AdminEmployeePortalPasswordPanel
                  employee={snapshot}
                  canManage={canManagePortalPassword}
                />
              </TabsContent>
            )}

            <TabsContent value="deployment">
              <EmployeeDeploymentLogList
                employee={snapshot}
                logs={bundle?.deploymentLogs ?? []}
                statuses={statuses}
                tabError={bundle?.errors.deployment}
                emptyMessage="No deployment status changes logged yet. Update deployment from the Actions column."
              />
            </TabsContent>

            <TabsContent value="updates">
              <EmployeeUpdateLogList
                logs={bundle?.profileLogs ?? []}
                tabError={bundle?.errors.profile}
                emptyMessage="This employee has no logged profile updates yet."
              />
            </TabsContent>

            <TabsContent value="accomplishments">
              <EmployeeAccomplishmentList
                records={bundle?.accomplishments ?? []}
                tabError={bundle?.errors.accomplishments}
                emptyMessage="This employee has no accomplishment updates yet. Team leader shared entries appear here with a From Team Leader badge."
              />
            </TabsContent>

            <TabsContent value="attendance">
              {bundle?.errors.attendance && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm mb-4">
                  {bundle.errors.attendance}
                </div>
              )}
              <p className="text-xs font-semibold text-dswd-navy uppercase tracking-wide mb-3">
                Time In / Out History ({bundle?.attendance.length ?? 0})
              </p>
              <EmployeeAttendanceList
                records={bundle?.attendance ?? []}
                showSelfies
                emptyMessage="This employee has no time in/out records yet."
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
