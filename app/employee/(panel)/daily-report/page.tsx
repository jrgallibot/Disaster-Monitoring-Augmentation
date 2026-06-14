import { TeamDailyReportPanel } from "@/components/employee/TeamDailyReportPanel";
import {
  getTeamDailyReportData,
  requireTeamLeaderForPage,
} from "@/lib/actions/team-leader";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DailyTeamReportPage() {
  const context = await requireTeamLeaderForPage();
  const reportData = await getTeamDailyReportData();

  if (!reportData) {
    redirect("/employee/dashboard");
  }

  const regionLabel = context.ledRegions.map((region) => region.code).join(", ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gov-section-title">Daily Team Report</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Today&apos;s operational report for region{" "}
          <strong className="text-foreground">{regionLabel}</strong> — actual tasks, deployment
          status, deployment locations, and member activity for the current day.
        </p>
      </div>

      <TeamDailyReportPanel initialData={reportData} />
    </div>
  );
}
