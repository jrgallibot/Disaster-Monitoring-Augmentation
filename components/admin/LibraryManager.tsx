"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, ToggleLeft, ToggleRight, Search } from "lucide-react";
import {
  createSpecialization,
  updateSpecialization,
  createRegion,
  updateRegion,
  createStatus,
  updateStatus,
} from "@/lib/actions/employees";
import { getTeamLeaderDisplay, getRegionTeamLeaderSummaries } from "@/lib/utils";
import type {
  LibrarySpecialization,
  LibraryRegion,
  LibraryStatus,
  EmployeeWithRelations,
} from "@/lib/types";
import type { ActionResult } from "@/lib/types";
import { toast } from "@/lib/toast";

interface LibraryManagerProps {
  specializations: LibrarySpecialization[];
  regions: LibraryRegion[];
  statuses: LibraryStatus[];
  employees: EmployeeWithRelations[];
}

export function LibraryManager({
  specializations,
  regions,
  statuses,
  employees,
}: LibraryManagerProps) {
  const teamLeaderOptions = employees
    .map((employee) => ({
      id: employee.id,
      label: `${employee.last_name}, ${employee.first_name} (${employee.employee_id})`,
    }))
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    );

  return (
    <Tabs defaultValue="specializations">
      <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1">
        <TabsTrigger value="specializations">Specializations</TabsTrigger>
        <TabsTrigger value="regions">Regions</TabsTrigger>
        <TabsTrigger value="statuses">Statuses</TabsTrigger>
      </TabsList>

      <TabsContent value="specializations">
        <LibraryTable
          title="Specializations"
          items={specializations}
          columns={["name", "description", "sort_order", "is_active"]}
          onCreate={async (data) =>
            createSpecialization({
              name: data.name as string,
              description: data.description as string,
              sort_order: Number(data.sort_order) || 0,
            })
          }
          onUpdate={async (id, data) =>
            updateSpecialization(id, {
              name: data.name as string,
              description: data.description as string,
              sort_order: Number(data.sort_order) || 0,
              is_active: data.is_active as boolean,
            })
          }
          fields={[
            { key: "name", label: "Name", required: true },
            { key: "description", label: "Description" },
            { key: "sort_order", label: "Sort Order", type: "number" },
          ]}
        />
      </TabsContent>

      <TabsContent value="regions">
        <LibraryTable
          title="Regions"
          items={regions}
          columns={["name", "code", "team_leaders", "sort_order", "is_active"]}
          teamLeaderOptions={teamLeaderOptions}
          onCreate={async (data) =>
            createRegion({
              name: data.name as string,
              code: data.code as string,
              team_leader_employee_ids: String(data.team_leader_employee_ids ?? "")
                .split(",")
                .filter(Boolean),
              sort_order: Number(data.sort_order) || 0,
            })
          }
          onUpdate={async (id, data) =>
            updateRegion(id, {
              name: data.name as string,
              code: data.code as string,
              team_leader_employee_ids: String(data.team_leader_employee_ids ?? "")
                .split(",")
                .filter(Boolean),
              sort_order: Number(data.sort_order) || 0,
              is_active: data.is_active as boolean,
            })
          }
          fields={[
            { key: "name", label: "Name", required: true },
            { key: "code", label: "Code", required: true },
            {
              key: "team_leaders",
              label: "Team Leaders (Employees)",
              type: "team_leaders_multi",
            },
            { key: "sort_order", label: "Sort Order", type: "number" },
          ]}
        />
      </TabsContent>

      <TabsContent value="statuses">
        <LibraryTable
          title="Statuses"
          items={statuses}
          columns={["name", "color", "sort_order", "is_active"]}
          onCreate={async (data) =>
            createStatus({
              name: data.name as string,
              color: data.color as string,
              sort_order: Number(data.sort_order) || 0,
            })
          }
          onUpdate={async (id, data) =>
            updateStatus(id, {
              name: data.name as string,
              color: data.color as string,
              sort_order: Number(data.sort_order) || 0,
              is_active: data.is_active as boolean,
            })
          }
          fields={[
            { key: "name", label: "Name", required: true },
            { key: "color", label: "Color", type: "color" },
            { key: "sort_order", label: "Sort Order", type: "number" },
          ]}
        />
      </TabsContent>
    </Tabs>
  );
}

interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
  type?: string;
}

interface LibraryTableProps {
  title: string;
  items: (LibrarySpecialization | LibraryRegion | LibraryStatus)[];
  columns: string[];
  fields: FieldDef[];
  teamLeaderOptions?: { id: string; label: string }[];
  onCreate: (data: Record<string, string | boolean | number>) => Promise<ActionResult>;
  onUpdate: (id: string, data: Record<string, string | boolean | number>) => Promise<ActionResult>;
}

function LibraryTable({
  title,
  items,
  fields,
  teamLeaderOptions = [],
  onCreate,
  onUpdate,
}: LibraryTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [teamLeaderIds, setTeamLeaderIds] = useState<string[]>([]);
  const [teamLeaderSearchQuery, setTeamLeaderSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const filteredTeamLeaderOptions = useMemo(() => {
    const query = teamLeaderSearchQuery.trim().toLowerCase();
    if (!query) return teamLeaderOptions;
    return teamLeaderOptions.filter((option) =>
      option.label.toLowerCase().includes(query)
    );
  }, [teamLeaderOptions, teamLeaderSearchQuery]);

  const editingItem = items.find((i) => i.id === editingId);

  function openCreateForm() {
    setEditingId(null);
    setTeamLeaderIds([]);
    setTeamLeaderSearchQuery("");
    setShowForm(true);
  }

  function openEditForm(id: string) {
    const item = items.find((i) => i.id === id);
    setEditingId(id);
    setShowForm(false);
    setTeamLeaderSearchQuery("");
    if (item && "team_leaders" in item) {
      setTeamLeaderIds((item.team_leaders ?? []).map((link) => link.employee_id));
    } else {
      setTeamLeaderIds([]);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const data: Record<string, string | boolean | number> = {};
    fields.forEach((f) => {
      if (f.type === "team_leaders_multi") {
        data.team_leader_employee_ids = teamLeaderIds.join(",");
        return;
      }
      data[f.key] = form.get(f.key) as string;
    });

    startTransition(async () => {
      const result = editingId
        ? await onUpdate(editingId, { ...data, is_active: items.find((i) => i.id === editingId)?.is_active ?? true })
        : await onCreate(data);

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success(editingId ? "Library item updated successfully." : "Library item created successfully.");
      setShowForm(false);
      setEditingId(null);
      setTeamLeaderIds([]);
      setTeamLeaderSearchQuery("");
      router.refresh();
    });
  }

  function toggleActive(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    startTransition(async () => {
      const data: Record<string, string | boolean | number> = {
        name: item.name,
        is_active: !item.is_active,
      };
      if ("code" in item) data.code = item.code;
      if ("team_leaders" in item) {
        data.team_leader_employee_ids = (item.team_leaders ?? [])
          .map((link) => link.employee_id)
          .join(",");
      }
      if ("color" in item) data.color = item.color;
      if ("description" in item) data.description = item.description ?? "";
      data.sort_order = item.sort_order;

      const result = await onUpdate(id, data);
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(
        item.is_active ? "Library item deactivated." : "Library item activated."
      );
      router.refresh();
    });
  }

  function renderCell(item: LibrarySpecialization | LibraryRegion | LibraryStatus, field: FieldDef) {
    if (field.key === "color" && "color" in item) {
      return (
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-4 w-4 rounded-full border"
            style={{ backgroundColor: item.color }}
          />
          {item.color}
        </span>
      );
    }

    if (field.key === "description" && "description" in item) {
      return item.description ?? "—";
    }

    if (field.key === "code" && "code" in item) {
      return item.code;
    }

    if (field.key === "team_leaders" && "team_leaders" in item) {
      const labels = getRegionTeamLeaderSummaries(item)
        .map((leader) => getTeamLeaderDisplay(leader))
        .filter(Boolean);
      return labels.length ? labels.join(", ") : "—";
    }

    return String((item as unknown as Record<string, unknown>)[field.key] ?? "—");
  }

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button size="sm" onClick={openCreateForm}>
          <Plus className="h-4 w-4" />
          Add New
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        {(showForm || editingId) && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 p-4 border border-dswd-border rounded-lg bg-dswd-light space-y-4"
          >
            <h4 className="font-semibold text-dswd-navy">
              {editingId ? "Edit Item" : "Add New Item"}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((field) => (
                <div
                  key={field.key}
                  className={`space-y-2 ${field.type === "team_leaders_multi" ? "sm:col-span-2" : ""}`}
                >
                  <Label htmlFor={field.key}>{field.label}</Label>
                  {field.type === "team_leaders_multi" ? (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={teamLeaderSearchQuery}
                          onChange={(event) => setTeamLeaderSearchQuery(event.target.value)}
                          placeholder="Search by name or employee ID..."
                          className="pl-9"
                          aria-label="Search team leaders"
                        />
                      </div>
                      <div className="space-y-2 max-h-52 overflow-y-auto border border-dswd-border rounded-md p-3 bg-white">
                        {teamLeaderOptions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No employees available.</p>
                        ) : filteredTeamLeaderOptions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No employees match your search.
                          </p>
                        ) : (
                          filteredTeamLeaderOptions.map((option) => (
                            <label
                              key={option.id}
                              className="flex items-start gap-2 text-sm cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={teamLeaderIds.includes(option.id)}
                                onChange={(event) => {
                                  setTeamLeaderIds((current) =>
                                    event.target.checked
                                      ? [...current, option.id]
                                      : current.filter((id) => id !== option.id)
                                  );
                                }}
                              />
                              <span>{option.label}</span>
                            </label>
                          ))
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Select one or more team leaders for this region. Employees choose their leader when more than one is assigned.
                      </p>
                    </>
                  ) : (
                    <Input
                      id={field.key}
                      name={field.key}
                      type={field.type ?? "text"}
                      defaultValue={
                        editingItem
                          ? String((editingItem as unknown as Record<string, unknown>)[field.key] ?? "")
                          : field.key === "color"
                          ? "#0066CC"
                          : ""
                      }
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setTeamLeaderIds([]);
                  setTeamLeaderSearchQuery("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dswd-border bg-dswd-light">
                {fields.map((f) => (
                  <th key={f.key} className="text-left p-3 font-semibold text-dswd-navy">
                    {f.label}
                  </th>
                ))}
                <th className="text-left p-3 font-semibold text-dswd-navy">Active</th>
                <th className="text-left p-3 font-semibold text-dswd-navy">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-dswd-border">
                  {fields.map((f) => (
                    <td key={f.key} className="p-3">
                      {renderCell(item, f)}
                    </td>
                  ))}
                  <td className="p-3">
                    <Badge variant={item.is_active ? "default" : "outline"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditForm(item.id)}
                        className="text-dswd-blue hover:underline flex items-center gap-1 text-xs"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => toggleActive(item.id)}
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                        disabled={isPending}
                      >
                        {item.is_active ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                        {item.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
