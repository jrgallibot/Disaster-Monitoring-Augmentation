import { AdminDashboardPanel } from "@/components/admin/dashboard/AdminDashboardPanel";
import { getAdminOperationsReportData } from "@/lib/actions/admin-reports";
import { getAdminDashboardData } from "@/lib/actions/employees";
import { requireAdminForPage } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const access = await requireAdminForPage();
  const [data, operationsReport] = await Promise.all([
    getAdminDashboardData(),
    getAdminOperationsReportData(),
  ]);

  return (
    <AdminDashboardPanel
      initialData={data}
      operationsReport={operationsReport}
      canWrite={access.canWrite}
    />
  );
}
