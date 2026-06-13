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
import { getEmployeeTeamLeader } from "@/lib/utils";
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
}

export function EmployeeForm({
  employee,
  specializations,
  regions,
}: EmployeeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [specializationId, setSpecializationId] = useState(employee?.specialization_id ?? "");
  const [regionId, setRegionId] = useState(employee?.region_id ?? "");

  const isEdit = !!employee;

  const selectedRegion = useMemo(
    () => regions.find((r) => r.id === regionId),
    [regionId, regions]
  );

  const teamLeader = selectedRegion?.team_leader_name?.trim() || getEmployeeTeamLeader(employee ?? { region: null });

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
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateEmployee(employee.id, data)
        : await createEmployee(data);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/admin/employees");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Employee" : "Add New Employee"}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Deployment status is updated from the employees list Actions column.
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
              />
            </div>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
