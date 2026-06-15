import { MobilizationReportPanel } from "@/components/shared/MobilizationReportPanel";
import {
  getTeamMobilizationReportData,
  getTeamMobilizationReportFilterOptions,
} from "@/lib/actions/mobilization";
import { requireTeamLeaderForPage } from "@/lib/actions/team-leader";

export const dynamic = "force-dynamic";

export default async function EmployeeMobilizationReportPage() {
  const [context, reportData, filterOptions] = await Promise.all([
    requireTeamLeaderForPage(),
    getTeamMobilizationReportData(),
    getTeamMobilizationReportFilterOptions(),
  ]);

  const regionLabel = context.ledRegions.map((region) => region.code).join(", ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gov-section-title">Team Mobilization Report</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Augmentation status for your team in{" "}
          <strong className="text-foreground">{regionLabel}</strong>. Filter by date range to see
          who was mobilized or demobilized during the period.
        </p>
      </div>

      <MobilizationReportPanel
        initialData={reportData}
        filterOptions={filterOptions}
        showFilters
        title={`Team Mobilization Report — ${regionLabel}`}
        onRefresh={getTeamMobilizationReportData}
      />
    </div>
  );
}
