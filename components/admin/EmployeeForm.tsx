"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createEmployee,
  updateEmployee,
} from "@/lib/actions/employees";
import { updateTeamMemberProfile } from "@/lib/actions/team-leader";
import { PORTAL_ROLE_LABELS } from "@/lib/auth/roles";
import { getEmployeeTeamLeader, getTeamLeaderDisplay, getRegionTeamLeaderSummaries } from "@/lib/utils";
import type {
  EmployeeWithRelations,
  LibraryRegion,
  LibrarySpecialization,
  EmployeeFormData,
} from "@/lib/types";

interface EmployeeFormProps {
  employee?: EmployeeWithRelations;
  specializations: LibrarySpecialization[];
  regions: LibraryRegion[];
  portalRole?: "employee" | "admin" | "team_leader" | null;
  mode?: "admin" | "teamLeader";
  successHref?: string;
}

export function EmployeeForm({
  employee,
  specializations,
  regions,
  portalRole = null,
  mode = "admin",
  successHref,
}: EmployeeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [specializationId, setSpecializationId] = useState(employee?.specialization_id ?? "");
  const [regionId, setRegionId] = useState(employee?.region_id ?? "");
  const [accessRole, setAccessRole] = useState<"employee" | "admin" | "team_leader">(
    portalRole ?? "employee"
  );

  const isEdit = !!employee;
  const isTeamLeaderMode = mode === "teamLeader";

  const selectedRegion = useMemo(
    () => regions.find((r) => r.id === regionId),
    [regionId, regions]
  );

  const teamLeader =
    getTeamLeaderDisplay(employee?.assigned_team_leader) ||
    getTeamLeaderDisplay(getRegionTeamLeaderSummaries(selectedRegion)[0]) ||
    getEmployeeTeamLeader(employee ?? { region: null });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    const data: EmployeeFormData = {
      employee_id: form.get("employee_id") as string,
      first_name: form.get("first_name") as string,
      last_name: form.get("last_name") as string,
      middle_name: (form.get("middle_name") as string) || undefined,
      email: (form.get("email") as string) || undefined,
      phone: (form.get("phone") as string) || undefined,
      address: (form.get("address") as string) || undefined,
      specialization_id: specializationId || undefined,
      region_id: regionId || undefined,
      notes: (form.get("notes") as string) || undefined,
      photo_url: (form.get("photo_url") as string) || undefined,
      portal_role: employee?.user_id ? accessRole : undefined,
    };

    startTransition(async () => {
      const result = isEdit
        ? isTeamLeaderMode
          ? await updateTeamMemberProfile(employee.id, data)
          : await updateEmployee(employee.id, data)
        : await createEmployee(data);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(successHref ?? (isTeamLeaderMode ? "/employee/team" : "/admin/employees"));
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Employee" : "Add New Employee"}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {isTeamLeaderMode
            ? "Update profile details for your team member. Deployment status is updated from the team list."
            : "Deployment status is updated from the employees list Actions column."}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee ID *</Label>
              <Input
                id="employee_id"
                name="employee_id"
                defaultValue={employee?.employee_id}
                placeholder="16-11661"
                required
                readOnly={isTeamLeaderMode}
                className={isTeamLeaderMode ? "bg-dswd-light" : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                name="first_name"
                defaultValue={employee?.first_name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                name="last_name"
                defaultValue={employee?.last_name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="middle_name">Middle Name</Label>
              <Input
                id="middle_name"
                name="middle_name"
                defaultValue={employee?.middle_name ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialization_id">Specialization</Label>
              <Select value={specializationId} onValueChange={setSpecializationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select specialization" />
                </SelectTrigger>
                <SelectContent>
                  {specializations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="region_id">Region</Label>
              {isTeamLeaderMode ? (
                <Input
                  value={
                    employee?.region
                      ? `${employee.region.name} (${employee.region.code})`
                      : "—"
                  }
                  readOnly
                  className="bg-dswd-light"
                />
              ) : (
              <Select value={regionId} onValueChange={setRegionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Assigned Team Leader</Label>
              <Input
                value={teamLeader ?? "Not assigned for selected region"}
                readOnly
                className="bg-dswd-light"
              />
              <p className="text-xs text-muted-foreground">
                Set team leaders in Admin → Libraries → Regions.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={employee?.email ?? ""}
                readOnly={isTeamLeaderMode}
                className={isTeamLeaderMode ? "bg-dswd-light" : undefined}
              />
            </div>
            {!isTeamLeaderMode && isEdit && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="portal_role">Portal Access Role</Label>
                {employee?.user_id ? (
                  <>
                    <Select
                      value={accessRole}
                      onValueChange={(value) =>
                        setAccessRole(value as "employee" | "admin" | "team_leader")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select portal access" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">
                          {PORTAL_ROLE_LABELS.employee}
                        </SelectItem>
                        <SelectItem value="team_leader">
                          {PORTAL_ROLE_LABELS.team_leader}
                        </SelectItem>
                        <SelectItem value="admin">
                          {PORTAL_ROLE_LABELS.admin}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Employees use the Employee Portal only. Team leaders can monitor assigned
                      members. Administrators use the Admin Monitoring portal with full control.
                      Team leader role also links this employee to their region in Libraries.
                    </p>
                  </>
                ) : (
                  <Input
                    value="No portal account — employee must register first"
                    readOnly
                    className="bg-dswd-light"
                  />
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={employee?.phone ?? ""}
                placeholder="09XX XXX XXXX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              defaultValue={employee?.address ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={employee?.notes ?? ""}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Update Employee" : "Add Employee"}
            </Button>
            {!isTeamLeaderMode && (
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            )}
            {isTeamLeaderMode && (
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(successHref ?? "/employee/team")}
            >
              Cancel
            </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
