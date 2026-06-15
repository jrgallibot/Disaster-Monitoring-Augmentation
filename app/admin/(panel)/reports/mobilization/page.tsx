import { MobilizationReportPanel } from "@/components/shared/MobilizationReportPanel";
import {
  getMobilizationReportData,
  getMobilizationReportFilterOptions,
} from "@/lib/actions/mobilization";

export const dynamic = "force-dynamic";

export default async function AdminMobilizationReportPage() {
  const [reportData, filterOptions] = await Promise.all([
    getMobilizationReportData(),
    getMobilizationReportFilterOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gov-section-title">Mobilization Report</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Track personnel who are mobilized or demobilized during a date range. This is separate
          from daily deployment status.
        </p>
      </div>

      <MobilizationReportPanel
        initialData={reportData}
        filterOptions={filterOptions}
        showFilters
        showTeamFilter
        title="Mobilization Report"
        onRefresh={getMobilizationReportData}
      />
    </div>
  );
}
