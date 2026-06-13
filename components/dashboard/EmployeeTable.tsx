"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, User } from "lucide-react";
import { getFullName } from "@/lib/utils";
import type {
  EmployeeWithRelations,
  LibraryRegion,
  LibrarySpecialization,
  LibraryStatus,
} from "@/lib/types";

interface EmployeeTableProps {
  employees: EmployeeWithRelations[];
  regions: LibraryRegion[];
  statuses: LibraryStatus[];
  specializations: LibrarySpecialization[];
  showActions?: boolean;
}

export function EmployeeTable({
  employees: initialEmployees,
  regions,
  statuses,
  specializations,
  showActions = false,
}: EmployeeTableProps) {
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [specFilter, setSpecFilter] = useState("all");

  const filtered = initialEmployees.filter((e) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      e.first_name.toLowerCase().includes(term) ||
      e.last_name.toLowerCase().includes(term) ||
      e.employee_id.toLowerCase().includes(term) ||
      (e.deployment_location?.toLowerCase().includes(term) ?? false);

    const matchesRegion =
      regionFilter === "all" || e.region_id === regionFilter;
    const matchesStatus =
      statusFilter === "all" || e.status_id === statusFilter;
    const matchesSpec =
      specFilter === "all" || e.specialization_id === specFilter;

    return matchesSearch && matchesRegion && matchesStatus && matchesSpec;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Augmented Employees</CardTitle>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search employees"
            />
          </div>
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={specFilter} onValueChange={setSpecFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Specialization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specializations</SelectItem>
              {specializations.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filtered.length} of {initialEmployees.length} employees
        </p>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dswd-border bg-dswd-light">
                <th className="text-left p-3 font-semibold text-dswd-navy">Employee ID</th>
                <th className="text-left p-3 font-semibold text-dswd-navy">Name</th>
                <th className="text-left p-3 font-semibold text-dswd-navy">Specialization</th>
                <th className="text-left p-3 font-semibold text-dswd-navy">Region</th>
                <th className="text-left p-3 font-semibold text-dswd-navy">Status</th>
                <th className="text-left p-3 font-semibold text-dswd-navy">Deployment</th>
                {showActions && (
                  <th className="text-left p-3 font-semibold text-dswd-navy">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.id} className="border-b border-dswd-border hover:bg-dswd-light/50">
                  <td className="p-3 font-mono text-xs">{emp.employee_id}</td>
                  <td className="p-3">
                    <Link
                      href={`/employees/${emp.id}`}
                      className="text-dswd-blue hover:underline font-medium"
                    >
                      {getFullName(emp.first_name, emp.last_name, emp.middle_name)}
                    </Link>
                  </td>
                  <td className="p-3">{emp.specialization?.name ?? "—"}</td>
                  <td className="p-3">{emp.region?.code ?? "—"}</td>
                  <td className="p-3">
                    {emp.status ? (
                      <Badge color={emp.status.color}>{emp.status.name}</Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                    {emp.deployment_location ?? "—"}
                  </td>
                  {showActions && (
                    <td className="p-3">
                      <Link
                        href={`/admin/employees/${emp.id}/edit`}
                        className="text-dswd-blue hover:underline text-xs"
                      >
                        Edit
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {filtered.map((emp) => (
            <Link
              key={emp.id}
              href={showActions ? `/admin/employees/${emp.id}/edit` : `/employees/${emp.id}`}
              className="block gov-card p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-dswd-light flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-dswd-navy" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-dswd-navy truncate">
                      {getFullName(emp.first_name, emp.last_name, emp.middle_name)}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{emp.employee_id}</p>
                  </div>
                </div>
                {emp.status && (
                  <Badge color={emp.status.color} className="shrink-0">
                    {emp.status.name}
                  </Badge>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Region: <strong className="text-foreground">{emp.region?.code ?? "—"}</strong></span>
                <span>Role: <strong className="text-foreground">{emp.specialization?.name ?? "—"}</strong></span>
                {emp.deployment_location && (
                  <span className="col-span-2 truncate">
                    Location: <strong className="text-foreground">{emp.deployment_location}</strong>
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No employees match your filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
