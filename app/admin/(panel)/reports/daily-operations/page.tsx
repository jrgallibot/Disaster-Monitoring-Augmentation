import { AdminOperationsReportPanel } from "@/components/admin/AdminOperationsReportPanel";
import { getAdminOperationsReportData } from "@/lib/actions/admin-reports";

export const dynamic = "force-dynamic";

export default async function AdminDailyOperationsReportPage() {
  const reportData = await getAdminOperationsReportData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gov-section-title">Daily Operations Report</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Full report for every regional team leader and their assigned members — actual tasks,
          deployment status, deployment locations, attendance, and today&apos;s accomplishments.
        </p>
      </div>

      <AdminOperationsReportPanel initialData={reportData} />
    </div>
  );
}
