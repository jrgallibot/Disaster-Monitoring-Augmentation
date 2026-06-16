"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminDeploymentUpdateDialog } from "@/components/admin/AdminDeploymentUpdateDialog";
import { AdminEmployeeHistoryDialog } from "@/components/admin/AdminEmployeeHistoryDialog";
import { AdminEmployeePasswordDialog } from "@/components/admin/AdminEmployeePasswordDialog";
import { MobilizationUpdateDialog } from "@/components/shared/MobilizationUpdateDialog";
import { BulkMobilizationUpdateDialog } from "@/components/shared/BulkMobilizationUpdateDialog";
import { MobilizationStatusBadge } from "@/components/shared/MobilizationStatusBadge";
import { EmployeeAvatar } from "@/components/shared/EmployeeAvatar";
import { statusRequiresDeploymentLocation, statusRequiresDeploymentRemarks } from "@/lib/deployment";
import { formatMobilizationDate } from "@/lib/mobilization";
import { formatCoordinates, getMapUrl, hasValidCoordinates } from "@/lib/geo";
import { Search, History, MapPin, User, Briefcase, KeyRound, Eye, UserCheck } from "lucide-react";
import { getFullName, getEmployeeTeamLeader, getEmployeeTeamLeaderSearchText } from "@/lib/utils";
import { formatSexLabel } from "@/lib/sex-stats";
import type {
  EmployeeWithRelations,
  LibraryRegion,
  LibrarySpecialization,
  LibraryStatus,
  MobilizationStatus,
} from "@/lib/types";

interface EmployeeTableProps {
  employees: EmployeeWithRelations[];
  regions: LibraryRegion[];
  statuses: LibraryStatus[];
  specializations: LibrarySpecialization[];
  showActions?: boolean;
  /** Admin portal read-only: full columns + history, no edit/deployment */
  viewOnly?: boolean;
  /** Public homepage: rich columns, public profile links, no admin actions */
  publicEnriched?: boolean;
  /** Full admin only: reset / view portal passwords */
  showAdminPasswordActions?: boolean;
  editBasePath?: string;
  title?: string;
  hideRegionFilter?: boolean;
  hideTeamLeaderColumn?: boolean;
}

export function EmployeeTable({
  employees: initialEmployees,
  regions,
  statuses,
  specializations,
  showActions = false,
  viewOnly = false,
  publicEnriched = false,
  showAdminPasswordActions = false,
  editBasePath = "/admin/employees",
  title = "Augmented Employees",
  hideRegionFilter = false,
  hideTeamLeaderColumn = false,
}: EmployeeTableProps) {
  const showAdminColumns = showActions || viewOnly || publicEnriched;
  const showHistory = showActions || viewOnly;
  const profileHref = (id: string) =>
    publicEnriched ? `/employees/${id}` : showActions ? `${editBasePath}/${id}/edit` : `/employees/${id}`;
  const router = useRouter();
  const [employees, setEmployees] = useState(initialEmployees);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mobilizationFilter, setMobilizationFilter] = useState("all");
  const [specFilter, setSpecFilter] = useState("all");
  const [historyEmployee, setHistoryEmployee] = useState<EmployeeWithRelations | null>(null);
  const [deploymentEmployee, setDeploymentEmployee] = useState<EmployeeWithRelations | null>(null);
  const [mobilizationEmployee, setMobilizationEmployee] = useState<EmployeeWithRelations | null>(null);
  const [showBulkMobilizationDialog, setShowBulkMobilizationDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [passwordEmployee, setPasswordEmployee] = useState<EmployeeWithRelations | null>(null);
  const [passwordMode, setPasswordMode] = useState<"view" | "reset" | null>(null);

  function openPasswordDialog(emp: EmployeeWithRelations, mode: "view" | "reset") {
    setPasswordEmployee(emp);
    setPasswordMode(mode);
  }

  function closePasswordDialog() {
    setPasswordEmployee(null);
    setPasswordMode(null);
  }

  useEffect(() => {
    setEmployees(initialEmployees);
    setSelectedIds(new Set());
  }, [initialEmployees]);

  function toggleEmployeeSelection(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAllFiltered(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const employee of filtered) {
        if (checked) next.add(employee.id);
        else next.delete(employee.id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function handleDeploymentUpdated(updated: EmployeeWithRelations) {
    setEmployees((prev) =>
      prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e))
    );
    router.refresh();
  }

  function handleMobilizationUpdated(updated: EmployeeWithRelations) {
    setEmployees((prev) =>
      prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e))
    );
    router.refresh();
  }

  function handleBulkMobilizationUpdated(input: {
    status: MobilizationStatus;
    mobilizedAt: string;
    demobilizedAt: string | null;
    employeeIds: string[];
  }) {
    const idSet = new Set(input.employeeIds);
    setEmployees((prev) =>
      prev.map((employee) =>
        idSet.has(employee.id)
          ? {
              ...employee,
              mobilization_status: input.status,
              mobilized_at: input.mobilizedAt,
              demobilized_at: input.demobilizedAt,
              mobilization_updated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : employee
      )
    );
    clearSelection();
    router.refresh();
  }

  function renderMobilizationCell(emp: EmployeeWithRelations) {
    const status = emp.mobilization_status ?? "mobilized";
    const badge = <MobilizationStatusBadge status={status} interactive={showActions} />;

    if (showActions) {
      return (
        <button
          type="button"
          onClick={() => setMobilizationEmployee(emp)}
          className="inline-flex flex-col items-start gap-1"
          title="Click to update augmentation status"
        >
          {badge}
          <span className="text-xs text-muted-foreground">
            {formatMobilizationDate(emp.mobilized_at)}
            {emp.demobilized_at ? ` — ${formatMobilizationDate(emp.demobilized_at)}` : ""}
          </span>
        </button>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        {badge}
        <span className="text-xs text-muted-foreground">
          {formatMobilizationDate(emp.mobilized_at)}
          {emp.demobilized_at ? ` — ${formatMobilizationDate(emp.demobilized_at)}` : ""}
        </span>
      </div>
    );
  }

  function renderStatusCell(emp: EmployeeWithRelations) {
    if (emp.deploymentPending) {
      const pendingBadge = (
        <Badge className="bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-100">
          Pending Today
        </Badge>
      );

      if (showActions) {
        return (
          <button
            type="button"
            onClick={() => setDeploymentEmployee(emp)}
            className="inline-flex"
            title="Set today's deployment status"
          >
            {pendingBadge}
          </button>
        );
      }

      return pendingBadge;
    }

    if (emp.status) {
      if (showActions) {
        return (
          <button
            type="button"
            onClick={() => setDeploymentEmployee(emp)}
            className="inline-flex"
            title="Click to update deployment status"
          >
            <Badge color={emp.status.color} className="cursor-pointer hover:opacity-90">
              {emp.status.name}
            </Badge>
          </button>
        );
      }

      return <Badge color={emp.status.color}>{emp.status.name}</Badge>;
    }

    if (showActions) {
      return (
        <button
          type="button"
          onClick={() => setDeploymentEmployee(emp)}
          className="text-dswd-blue hover:underline text-xs"
        >
          Set status
        </button>
      );
    }

    return "—";
  }

  function isDeployed(emp: EmployeeWithRelations) {
    return statusRequiresDeploymentLocation(emp.status?.name);
  }

  function getActualTaskDisplay(emp: EmployeeWithRelations) {
    if (!isDeployed(emp)) return "—";
    return emp.actual_task ?? "—";
  }

  function getDeploymentLocationDisplay(emp: EmployeeWithRelations) {
    if (!isDeployed(emp)) return "—";
    return emp.deployment_location ?? "—";
  }

  function getDeploymentRemarksDisplay(emp: EmployeeWithRelations) {
    if (!statusRequiresDeploymentRemarks(emp.status?.name)) return "—";
    return emp.deployment_remarks ?? "—";
  }

  const filtered = employees.filter((e) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      e.first_name.toLowerCase().includes(term) ||
      e.last_name.toLowerCase().includes(term) ||
      e.employee_id.toLowerCase().includes(term) ||
      (e.deployment_location?.toLowerCase().includes(term) ?? false) ||
      (getEmployeeTeamLeaderSearchText(e).includes(term));

    const matchesRegion =
      regionFilter === "all" || e.region_id === regionFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "__pending__" && e.deploymentPending) ||
      e.status_id === statusFilter;
    const matchesMobilization =
      mobilizationFilter === "all" ||
      (e.mobilization_status ?? "mobilized") === mobilizationFilter;
    const matchesSpec =
      specFilter === "all" || e.specialization_id === specFilter;

    return matchesSearch && matchesRegion && matchesStatus && matchesMobilization && matchesSpec;
  });

  const selectedEmployees = useMemo(
    () => employees.filter((employee) => selectedIds.has(employee.id)),
    [employees, selectedIds]
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((employee) => selectedIds.has(employee.id));
  const someFilteredSelected = filtered.some((employee) => selectedIds.has(employee.id));

  const checkboxClassName =
    "h-4 w-4 rounded border-dswd-border text-dswd-navy focus:ring-dswd-navy cursor-pointer";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, team leader, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Search employees"
              />
            </div>
            {!hideRegionFilter && (
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
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Deployment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Deployment</SelectItem>
                <SelectItem value="__pending__">Pending Today</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={mobilizationFilter} onValueChange={setMobilizationFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Augmentation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Augmentation</SelectItem>
                <SelectItem value="mobilized">Mobilized</SelectItem>
                <SelectItem value="demobilized">Demobilized</SelectItem>
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
          {showActions && selectedIds.size > 0 && (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-dswd-border bg-dswd-light/70 px-4 py-3">
              <p className="text-sm text-dswd-navy font-medium">
                {selectedIds.size} employee{selectedIds.size === 1 ? "" : "s"} selected
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowBulkMobilizationDialog(true)}
                >
                  <UserCheck className="h-4 w-4" />
                  Update Augmentation
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground mb-4">
            Showing {filtered.length} of {employees.length} employees
          </p>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dswd-border bg-dswd-light">
                  {showActions && (
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        className={checkboxClassName}
                        checked={allFilteredSelected}
                        ref={(element) => {
                          if (element) element.indeterminate = someFilteredSelected && !allFilteredSelected;
                        }}
                        onChange={(event) => toggleSelectAllFiltered(event.target.checked)}
                        aria-label="Select all visible employees"
                      />
                    </th>
                  )}
                  {showAdminColumns && (
                    <th className="text-left p-3 font-semibold text-dswd-navy">Photo</th>
                  )}
                  <th className="text-left p-3 font-semibold text-dswd-navy">Employee ID</th>
                  <th className="text-left p-3 font-semibold text-dswd-navy">Name</th>
                  <th className="text-left p-3 font-semibold text-dswd-navy">Sex</th>
                  <th className="text-left p-3 font-semibold text-dswd-navy">Specialization</th>
                  <th className="text-left p-3 font-semibold text-dswd-navy">Region</th>
                  <th className="text-left p-3 font-semibold text-dswd-navy">Augmentation</th>
                  <th className="text-left p-3 font-semibold text-dswd-navy">Deployment</th>
                  {showAdminColumns && !hideTeamLeaderColumn && (
                    <th className="text-left p-3 font-semibold text-dswd-navy">Team Leader</th>
                  )}
                  <th className="text-left p-3 font-semibold text-dswd-navy">Actual Task</th>
                  <th className="text-left p-3 font-semibold text-dswd-navy">Deployment Location</th>
                  <th className="text-left p-3 font-semibold text-dswd-navy min-w-[160px]">Remarks</th>
                  {showAdminColumns && (
                    <th className="text-left p-3 font-semibold text-dswd-navy">Last GPS</th>
                  )}
                  {showHistory && (
                    <th className="text-left p-3 font-semibold text-dswd-navy">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id} className="border-b border-dswd-border hover:bg-dswd-light/50">
                    {showActions && (
                      <td className="p-3">
                        <input
                          type="checkbox"
                          className={checkboxClassName}
                          checked={selectedIds.has(emp.id)}
                          onChange={(event) => toggleEmployeeSelection(emp.id, event.target.checked)}
                          aria-label={`Select ${getFullName(emp.first_name, emp.last_name, emp.middle_name)}`}
                        />
                      </td>
                    )}
                    {showAdminColumns && (
                      <td className="p-3">
                        <EmployeeAvatar photoUrl={emp.photo_url} size={40} />
                      </td>
                    )}
                    <td className="p-3 font-mono text-xs">{emp.employee_id}</td>
                    <td className="p-3">
                      <Link
                        href={profileHref(emp.id)}
                        className="text-dswd-blue hover:underline font-medium"
                      >
                        {getFullName(emp.first_name, emp.last_name, emp.middle_name)}
                      </Link>
                    </td>
                    <td className="p-3">{formatSexLabel(emp.sex)}</td>
                    <td className="p-3">{emp.specialization?.name ?? "—"}</td>
                    <td className="p-3">{emp.region?.code ?? "—"}</td>
                    <td className="p-3">{renderMobilizationCell(emp)}</td>
                    <td className="p-3">{renderStatusCell(emp)}</td>
                    {showAdminColumns && !hideTeamLeaderColumn && (
                      <td className="p-3 text-muted-foreground max-w-[160px] truncate">
                        {getEmployeeTeamLeader(emp) ?? "—"}
                      </td>
                    )}
                    <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                      {getActualTaskDisplay(emp)}
                    </td>
                    <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                      {getDeploymentLocationDisplay(emp)}
                    </td>
                    <td className="p-3 text-muted-foreground max-w-[220px] whitespace-pre-wrap">
                      {getDeploymentRemarksDisplay(emp)}
                    </td>
                    {showAdminColumns && (
                      <td className="p-3">
                        {hasValidCoordinates(emp.last_latitude, emp.last_longitude) ? (
                          <a
                            href={getMapUrl(emp.last_latitude, emp.last_longitude)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-dswd-blue hover:underline text-xs flex items-center gap-1"
                            title="Open last known location"
                          >
                            <MapPin className="h-3 w-3 shrink-0" />
                            {formatCoordinates(emp.last_latitude, emp.last_longitude)}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    )}
                    {showHistory && (
                      <td className="p-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          {showActions && (
                            <>
                              <button
                                type="button"
                                onClick={() => setMobilizationEmployee(emp)}
                                className="text-dswd-blue hover:underline text-xs inline-flex items-center gap-1"
                              >
                                <UserCheck className="h-3 w-3" />
                                Augmentation
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeploymentEmployee(emp)}
                                className="text-dswd-blue hover:underline text-xs inline-flex items-center gap-1"
                              >
                                <Briefcase className="h-3 w-3" />
                                Deployment
                              </button>
                              <Link
                                href={`${editBasePath}/${emp.id}/edit`}
                                className="text-dswd-blue hover:underline text-xs"
                              >
                                Edit
                              </Link>
                              {showAdminPasswordActions && emp.user_id && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openPasswordDialog(emp, "reset")}
                                    className="text-dswd-blue hover:underline text-xs inline-flex items-center gap-1"
                                  >
                                    <KeyRound className="h-3 w-3" />
                                    Reset Password
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openPasswordDialog(emp, "view")}
                                    className="text-dswd-blue hover:underline text-xs inline-flex items-center gap-1"
                                  >
                                    <Eye className="h-3 w-3" />
                                    View Password
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setHistoryEmployee(emp)}
                            className="text-dswd-blue hover:underline text-xs inline-flex items-center gap-1"
                          >
                            <History className="h-3 w-3" />
                            History
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {showActions && filtered.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-dswd-navy font-medium px-1">
                <input
                  type="checkbox"
                  className={checkboxClassName}
                  checked={allFilteredSelected}
                  ref={(element) => {
                    if (element) element.indeterminate = someFilteredSelected && !allFilteredSelected;
                  }}
                  onChange={(event) => toggleSelectAllFiltered(event.target.checked)}
                />
                Select all visible ({filtered.length})
              </label>
            )}
            {filtered.map((emp) => (
              <div key={emp.id} className="gov-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {showActions && (
                      <input
                        type="checkbox"
                        className={`${checkboxClassName} mt-1`}
                        checked={selectedIds.has(emp.id)}
                        onChange={(event) => toggleEmployeeSelection(emp.id, event.target.checked)}
                        aria-label={`Select ${getFullName(emp.first_name, emp.last_name, emp.middle_name)}`}
                      />
                    )}
                    {showAdminColumns ? (
                      <EmployeeAvatar photoUrl={emp.photo_url} size={48} />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-dswd-light flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-dswd-navy" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-dswd-navy truncate">
                        {getFullName(emp.first_name, emp.last_name, emp.middle_name)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{emp.employee_id}</p>
                    </div>
                  </div>
                  {renderStatusCell(emp)}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>
                    Sex: <strong className="text-foreground">{formatSexLabel(emp.sex)}</strong>
                  </span>
                  <span>
                    Specialization:{" "}
                    <strong className="text-foreground">{emp.specialization?.name ?? "—"}</strong>
                  </span>
                  <span>
                    Region: <strong className="text-foreground">{emp.region?.code ?? "—"}</strong>
                  </span>
                  <span className="col-span-2">
                    Augmentation:{" "}
                    <strong className="text-foreground">
                      {(emp.mobilization_status ?? "mobilized") === "mobilized"
                        ? "Mobilized"
                        : "Demobilized"}
                    </strong>
                    {" — "}
                    {formatMobilizationDate(emp.mobilized_at)}
                    {emp.demobilized_at ? ` to ${formatMobilizationDate(emp.demobilized_at)}` : ""}
                  </span>
                  {showAdminColumns && !hideTeamLeaderColumn && getEmployeeTeamLeader(emp) && (
                    <span className="col-span-2 truncate">
                      Team Leader: <strong className="text-foreground">{getEmployeeTeamLeader(emp)}</strong>
                    </span>
                  )}
                  {isDeployed(emp) && (
                    <>
                      <span className="col-span-2">
                        Actual Task:{" "}
                        <strong className="text-foreground">{emp.actual_task ?? "—"}</strong>
                      </span>
                      <span className="col-span-2 truncate">
                        Deployment Location:{" "}
                        <strong className="text-foreground">{emp.deployment_location ?? "—"}</strong>
                      </span>
                    </>
                  )}
                  {statusRequiresDeploymentRemarks(emp.status?.name) && (
                    <span className="col-span-2 whitespace-pre-wrap">
                      Remarks:{" "}
                      <strong className="text-foreground">{getDeploymentRemarksDisplay(emp)}</strong>
                    </span>
                  )}
                  {showAdminColumns && hasValidCoordinates(emp.last_latitude, emp.last_longitude) && (
                    <span className="col-span-2">
                      <a
                        href={getMapUrl(emp.last_latitude, emp.last_longitude)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-dswd-blue hover:underline inline-flex items-center gap-1"
                      >
                        <MapPin className="h-3 w-3" />
                        {formatCoordinates(emp.last_latitude, emp.last_longitude)}
                      </a>
                    </span>
                  )}
                </div>
                {showActions && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setMobilizationEmployee(emp)}>
                      <UserCheck className="h-4 w-4" />
                      Augmentation
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeploymentEmployee(emp)}>
                      <Briefcase className="h-4 w-4" />
                      Deployment
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`${editBasePath}/${emp.id}/edit`}>Edit</Link>
                    </Button>
                    {showAdminPasswordActions && emp.user_id && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPasswordDialog(emp, "reset")}
                        >
                          <KeyRound className="h-4 w-4" />
                          Reset Password
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPasswordDialog(emp, "view")}
                        >
                          <Eye className="h-4 w-4" />
                          View Password
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setHistoryEmployee(emp)}>
                      <History className="h-4 w-4" />
                      History
                    </Button>
                  </div>
                )}
                {viewOnly && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setHistoryEmployee(emp)}>
                      <History className="h-4 w-4" />
                      History
                    </Button>
                    <Link href={`/employees/${emp.id}`} className="text-xs text-dswd-blue hover:underline self-center">
                      View details
                    </Link>
                  </div>
                )}
                {publicEnriched && (
                  <Link
                    href={profileHref(emp.id)}
                    className="mt-3 block text-xs text-dswd-blue hover:underline"
                  >
                    View full profile
                  </Link>
                )}
                {!showAdminColumns && !publicEnriched && (
                  <Link href={`/employees/${emp.id}`} className="mt-3 block text-xs text-dswd-blue hover:underline">
                    View details
                  </Link>
                )}
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No employees match your filters.
            </div>
          )}
        </CardContent>
      </Card>

      {showActions && (
        <>
          <AdminDeploymentUpdateDialog
            employee={deploymentEmployee}
            statuses={statuses}
            onClose={() => setDeploymentEmployee(null)}
            onUpdated={handleDeploymentUpdated}
          />
          <MobilizationUpdateDialog
            employee={mobilizationEmployee}
            onClose={() => setMobilizationEmployee(null)}
            onUpdated={handleMobilizationUpdated}
          />
          <BulkMobilizationUpdateDialog
            employees={showBulkMobilizationDialog ? selectedEmployees : []}
            onClose={() => setShowBulkMobilizationDialog(false)}
            onUpdated={handleBulkMobilizationUpdated}
          />
        </>
      )}
      {showHistory && (
        <AdminEmployeeHistoryDialog
          employee={historyEmployee}
          statuses={statuses}
          onClose={() => setHistoryEmployee(null)}
          canManagePortalPassword={showAdminPasswordActions}
        />
      )}
      {showAdminPasswordActions && (
        <AdminEmployeePasswordDialog
          employee={passwordEmployee}
          mode={passwordMode}
          onClose={closePasswordDialog}
        />
      )}
    </>
  );
}
