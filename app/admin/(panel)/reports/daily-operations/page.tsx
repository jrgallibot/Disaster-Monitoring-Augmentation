import { AdminOperationsReportPanel } from "@/components/admin/AdminOperationsReportPanel";
import {
  getAdminDailyReportFilterOptions,
  getAdminOperationsReportData,
} from "@/lib/actions/admin-reports";

export const dynamic = "force-dynamic";

export default async function AdminDailyOperationsReportPage() {
  const [reportData, filterOptions] = await Promise.all([
    getAdminOperationsReportData(),
    getAdminDailyReportFilterOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gov-section-title">Daily Operations Report</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Full report for regional team leaders and their assigned members. Choose a report date,
          region, or specific team before printing or exporting.
        </p>
      </div>

      <AdminOperationsReportPanel
        initialData={reportData}
        filterOptions={filterOptions}
        showFilters
      />
    </div>
  );
}
