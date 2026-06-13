import { AdminDashboardPanel } from "@/components/admin/dashboard/AdminDashboardPanel";
import { getAdminDashboardData } from "@/lib/actions/employees";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return <AdminDashboardPanel initialData={data} />;
}
