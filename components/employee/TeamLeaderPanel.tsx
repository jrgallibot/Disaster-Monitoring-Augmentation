import { EmployeeTable } from "@/components/dashboard/EmployeeTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Users, FileText } from "lucide-react";
import type {
  EmployeeWithRelations,
  LibraryRegion,
  LibrarySpecialization,
  LibraryStatus,
} from "@/lib/types";

interface TeamLeaderPanelProps {
  ledRegions: LibraryRegion[];
  members: EmployeeWithRelations[];
  statuses: LibraryStatus[];
  specializations: LibrarySpecialization[];
}

export function TeamLeaderPanel({
  ledRegions,
  members,
  statuses,
  specializations,
}: TeamLeaderPanelProps) {
  const regionLabel = ledRegions.map((r) => r.code).join(", ");

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-dswd-navy flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Team — {regionLabel}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            As regional team leader, you can view and manage all employees in your assigned region(s) — update deployment status, edit profiles, view history, and share accomplishments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button asChild variant="outline" size="sm">
            <Link href="/employee/daily-report">
              <FileText className="h-4 w-4" />
              Daily Team Report
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/employee/team">Open full team view</Link>
          </Button>
        </div>
      </div>

      <EmployeeTable
        employees={members}
        regions={ledRegions}
        statuses={statuses}
        specializations={specializations}
        showActions
        editBasePath="/employee/team"
        title={`All Team Members (${members.length})`}
        hideRegionFilter
      />
    </div>
  );
}
