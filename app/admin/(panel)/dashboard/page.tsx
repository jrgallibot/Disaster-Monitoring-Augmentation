import { AdminDashboardPanel } from "@/components/admin/dashboard/AdminDashboardPanel";
import { getAdminOperationsReportData } from "@/lib/actions/admin-reports";
import { getAdminDashboardData } from "@/lib/actions/employees";
import { getAdminPortalAccess, hasEmployeePortalShortcut } from "@/lib/actions/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [showEmployeePortalLink, data, operationsReport, adminAccess] = await Promise.all([
    hasEmployeePortalShortcut(),
    getAdminDashboardData(),
    getAdminOperationsReportData(),
    getAdminPortalAccess(),
  ]);

  return (
    <div className="space-y-4">
      {showEmployeePortalLink && (
        <div className="flex justify-end print:hidden">
          <Button asChild>
            <Link href="/employee/dashboard">
              <UserCircle className="h-4 w-4" />
              Open Employee Portal
            </Link>
          </Button>
        </div>
      )}
      <AdminDashboardPanel
        initialData={data}
        operationsReport={operationsReport}
        canWrite={adminAccess?.canWrite ?? false}
        showEmployeePortalLink={showEmployeePortalLink}
      />
    </div>
  );
}
