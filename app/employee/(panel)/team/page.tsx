import { EmployeeTable } from "@/components/dashboard/EmployeeTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getSpecializations,
  getStatuses,
} from "@/lib/actions/employees";
import {
  getTeamMembersForLeader,
  requireTeamLeaderForPage,
} from "@/lib/actions/team-leader";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmployeeTeamPage() {
  const [context, members, statuses, specializations] = await Promise.all([
    requireTeamLeaderForPage(),
    getTeamMembersForLeader(),
    getStatuses(),
    getSpecializations(),
  ]);

  const regionLabel = context.ledRegions.map((r) => r.code).join(", ");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="gov-section-title">My Team</h1>
          <p className="text-sm text-muted-foreground mt-2">
            You are assigned as team leader for{" "}
            <strong className="text-foreground">{regionLabel}</strong>. View and manage all
            employees in your region — deployment status, profiles, history, and daily reports.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/employee/daily-report">
            <FileText className="h-4 w-4" />
            Daily Team Report
          </Link>
        </Button>
      </div>

      <EmployeeTable
        employees={members}
        regions={context.ledRegions}
        statuses={statuses}
        specializations={specializations}
        showActions
        editBasePath="/employee/team"
        title={`All Team Members — ${regionLabel} (${members.length})`}
        hideRegionFilter
      />
    </div>
  );
}
