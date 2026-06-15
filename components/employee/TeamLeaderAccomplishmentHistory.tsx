"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteMyAccomplishment,
  updateMyAccomplishment,
} from "@/lib/actions/accomplishments";
import { getManilaDateKeyFromTimestamp, getTodayInputValue } from "@/lib/report/date-bounds";
import { formatCoordinates, getMapUrl, hasValidCoordinates } from "@/lib/geo";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import type { EmployeeAccomplishment } from "@/lib/types";
import { MapPin, Pencil, Trash2, Users, X } from "lucide-react";

interface TeamLeaderAccomplishmentHistoryProps {
  records: EmployeeAccomplishment[];
  emptyMessage?: string;
}

export function TeamLeaderAccomplishmentHistory({
  records,
  emptyMessage = "No accomplishments recorded yet.",
}: TeamLeaderAccomplishmentHistoryProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editDate, setEditDate] = useState(getTodayInputValue());
  const [actionError, setActionError] = useState<string | null>(null);
  const todayKey = getTodayInputValue();

  const editableRecords = records.filter((record) => !record.shared_by_team_leader_id);

  function startEdit(record: EmployeeAccomplishment) {
    setActionError(null);
    setEditingId(record.id);
    setEditContent(record.content);
    setEditDate(getManilaDateKeyFromTimestamp(record.created_at));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
    setEditDate(todayKey);
    setActionError(null);
  }

  function handleSave(recordId: string) {
    setActionError(null);
    startTransition(async () => {
      const result = await updateMyAccomplishment(recordId, editContent, editDate);
      if (!result.success) {
        setActionError(result.error);
        toast.error(result.error);
        return;
      }

      setEditingId(null);
      setEditContent("");
      setEditDate(todayKey);
      if (result.memberUpdateCount && result.memberUpdateCount > 0) {
        toast.success(
          `Accomplishment updated and synced to ${result.memberUpdateCount} team member${result.memberUpdateCount === 1 ? "" : "s"}.`
        );
      } else {
        toast.success("Accomplishment updated.");
      }
      router.refresh();
    });
  }

  function handleDelete(record: EmployeeAccomplishment) {
    const confirmed = window.confirm(
      "Delete this accomplishment? This will also remove the shared copy from all team members."
    );
    if (!confirmed) return;

    setActionError(null);
    startTransition(async () => {
      const result = await deleteMyAccomplishment(record.id);
      if (!result.success) {
        setActionError(result.error);
        toast.error(result.error);
        return;
      }

      if (editingId === record.id) {
        cancelEdit();
      }

      if (result.memberDeleteCount && result.memberDeleteCount > 0) {
        toast.success(
          `Accomplishment deleted and removed from ${result.memberDeleteCount} team member${result.memberDeleteCount === 1 ? "" : "s"}.`
        );
      } else {
        toast.success("Accomplishment deleted.");
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {actionError}
        </div>
      )}

      <p className="text-xs font-semibold text-dswd-navy uppercase tracking-wide">
        Accomplishment History ({records.length})
      </p>
      <p className="text-xs text-muted-foreground">
        Edit or delete any accomplishment you submitted. Changes are applied to all assigned team
        members automatically.
      </p>

      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const isEditing = editingId === record.id;
            const isSharedFromLeader = Boolean(record.shared_by_team_leader_id);
            const canManage = !isSharedFromLeader;

            return (
              <div key={record.id} className="border border-dswd-border rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-muted-foreground">{formatDate(record.created_at)}</p>
                    {isSharedFromLeader && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Users className="h-3 w-3" />
                        From Team Leader
                      </Badge>
                    )}
                    {canManage && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Users className="h-3 w-3" />
                        Shared with team
                      </Badge>
                    )}
                  </div>

                  {canManage && !isEditing && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(record)}
                        disabled={isPending}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(record)}
                        disabled={isPending}
                        className="text-red-700 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`edit-date-${record.id}`}>Accomplishment Date</Label>
                      <Input
                        id={`edit-date-${record.id}`}
                        type="date"
                        value={editDate}
                        max={todayKey}
                        onChange={(event) => setEditDate(event.target.value)}
                        disabled={isPending}
                      />
                    </div>
                    <Textarea
                      value={editContent}
                      onChange={(event) => setEditContent(event.target.value)}
                      rows={5}
                      minLength={10}
                      disabled={isPending}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSave(record.id)}
                        disabled={isPending}
                      >
                        {isPending ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={cancelEdit}
                        disabled={isPending}
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-dswd-navy whitespace-pre-wrap">{record.content}</p>
                )}

                {hasValidCoordinates(record.latitude, record.longitude) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <a
                      href={getMapUrl(record.latitude, record.longitude)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-dswd-blue hover:underline font-medium"
                    >
                      {formatCoordinates(record.latitude, record.longitude)}
                    </a>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editableRecords.length === 0 && records.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Only accomplishments you submitted can be edited. Entries marked From Team Leader are
          read-only.
        </p>
      )}
    </div>
  );
}
