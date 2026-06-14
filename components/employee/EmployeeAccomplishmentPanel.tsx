"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeAccomplishmentList } from "@/components/shared/EmployeeAccomplishmentList";
import { addMyAccomplishment } from "@/lib/actions/accomplishments";
import { toast } from "@/lib/toast";
import { getCurrentPosition } from "@/lib/geo";
import type { EmployeeAccomplishment } from "@/lib/types";
import { ClipboardList, MapPin } from "lucide-react";

interface EmployeeAccomplishmentPanelProps {
  records: EmployeeAccomplishment[];
  isTeamLeader?: boolean;
}

export function EmployeeAccomplishmentPanel({
  records,
  isTeamLeader = false,
}: EmployeeAccomplishmentPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      const message = "Please enter your accomplishment or activity update.";
      setError(message);
      toast.error(message);
      return;
    }

    startTransition(async () => {
      const position = await getCurrentPosition();
      const result = await addMyAccomplishment(
        content,
        position?.latitude,
        position?.longitude
      );

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setContent("");
      if (isTeamLeader && result.sharedCount && result.sharedCount > 0) {
        toast.success(
          `Accomplishment saved and shared with ${result.sharedCount} team member${result.sharedCount === 1 ? "" : "s"}.`
        );
      } else if (isTeamLeader) {
        toast.success("Accomplishment saved. No team members are currently assigned to you.");
      } else {
        toast.success("Accomplishment saved successfully.");
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          My Accomplishments
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Submit your work accomplishments and activity updates from time to time. Each entry is timestamped.
          {isTeamLeader
            ? " As a team leader, your submissions are automatically copied to each assigned team member's accomplishment history."
            : " Entries shared by your team leader appear here with a From Team Leader badge."}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="accomplishment">Accomplishment / Activity Update *</Label>
            <Textarea
              id="accomplishment"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Describe what you accomplished today — tasks completed, families assisted, reports submitted, field activities, etc."
              required
              minLength={10}
            />
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            GPS location is captured when you submit (allow location access in your browser).
          </p>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Submit Accomplishment"}
          </Button>
        </form>

        <EmployeeAccomplishmentList records={records} />
      </CardContent>
    </Card>
  );
}
