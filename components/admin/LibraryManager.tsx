"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import {
  createSpecialization,
  updateSpecialization,
  createRegion,
  updateRegion,
  createStatus,
  updateStatus,
} from "@/lib/actions/employees";
import type {
  LibrarySpecialization,
  LibraryRegion,
  LibraryStatus,
} from "@/lib/types";

interface LibraryManagerProps {
  specializations: LibrarySpecialization[];
  regions: LibraryRegion[];
  statuses: LibraryStatus[];
}

export function LibraryManager({
  specializations,
  regions,
  statuses,
}: LibraryManagerProps) {
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
          onCreate={async (data) => {
            await createSpecialization({
              name: data.name as string,
              description: data.description as string,
              sort_order: Number(data.sort_order) || 0,
            });
          }}
          onUpdate={async (id, data) => {
            await updateSpecialization(id, {
              name: data.name as string,
              description: data.description as string,
              sort_order: Number(data.sort_order) || 0,
              is_active: data.is_active as boolean,
            });
          }}
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
          columns={["name", "code", "sort_order", "is_active"]}
          onCreate={async (data) => {
            await createRegion({
              name: data.name as string,
              code: data.code as string,
              sort_order: Number(data.sort_order) || 0,
            });
          }}
          onUpdate={async (id, data) => {
            await updateRegion(id, {
              name: data.name as string,
              code: data.code as string,
              sort_order: Number(data.sort_order) || 0,
              is_active: data.is_active as boolean,
            });
          }}
          fields={[
            { key: "name", label: "Name", required: true },
            { key: "code", label: "Code", required: true },
            { key: "sort_order", label: "Sort Order", type: "number" },
          ]}
        />
      </TabsContent>

      <TabsContent value="statuses">
        <LibraryTable
          title="Statuses"
          items={statuses}
          columns={["name", "color", "sort_order", "is_active"]}
          onCreate={async (data) => {
            await createStatus({
              name: data.name as string,
              color: data.color as string,
              sort_order: Number(data.sort_order) || 0,
            });
          }}
          onUpdate={async (id, data) => {
            await updateStatus(id, {
              name: data.name as string,
              color: data.color as string,
              sort_order: Number(data.sort_order) || 0,
              is_active: data.is_active as boolean,
            });
          }}
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
  onCreate: (data: Record<string, string | boolean | number>) => Promise<void>;
  onUpdate: (id: string, data: Record<string, string | boolean | number>) => Promise<void>;
}

function LibraryTable({
  title,
  items,
  fields,
  onCreate,
  onUpdate,
}: LibraryTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const editingItem = items.find((i) => i.id === editingId);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const data: Record<string, string | boolean | number> = {};
    fields.forEach((f) => {
      data[f.key] = form.get(f.key) as string;
    });

    startTransition(async () => {
      try {
        if (editingId) {
          const item = items.find((i) => i.id === editingId);
          await onUpdate(editingId, { ...data, is_active: item?.is_active ?? true });
        } else {
          await onCreate(data);
        }
        setShowForm(false);
        setEditingId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    });
  }

  function toggleActive(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    startTransition(async () => {
      try {
        const data: Record<string, string | boolean | number> = {
          name: item.name,
          is_active: !item.is_active,
        };
        if ("code" in item) data.code = item.code;
        if ("color" in item) data.color = item.color;
        if ("description" in item) data.description = item.description ?? "";
        data.sort_order = item.sort_order;
        await onUpdate(id, data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    });
  }

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setEditingId(null);
            setShowForm(true);
          }}
        >
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
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
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
                      {f.key === "color" && "color" in item ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-4 w-4 rounded-full border"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.color}
                        </span>
                      ) : f.key === "description" && "description" in item ? (
                        item.description ?? "—"
                      ) : f.key === "code" && "code" in item ? (
                        item.code
                      ) : (
                        String((item as unknown as Record<string, unknown>)[f.key] ?? "—")
                      )}
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
                        onClick={() => {
                          setEditingId(item.id);
                          setShowForm(false);
                        }}
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
