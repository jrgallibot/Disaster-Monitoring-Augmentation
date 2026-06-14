import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { EmployeeSidebar } from "@/components/employee/EmployeeSidebar";
import { getAdminPortalAccess, requireEmployeeForPage } from "@/lib/actions/auth";
import { getTeamLeaderContext } from "@/lib/actions/team-leader";

export default async function EmployeePanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireEmployeeForPage();
  const [teamLeaderContext, adminAccess] = await Promise.all([
    getTeamLeaderContext(),
    getAdminPortalAccess(),
  ]);

  return (
    <>
      <Header showAdminLink={false} showEmployeeLink={false} homeHref="/employee/dashboard" />
      <div className="flex flex-1 min-h-0">
        <EmployeeSidebar
          showTeamLink={teamLeaderContext.isTeamLeader}
          adminPortalAccess={adminAccess}
        />
        <main className="flex-1 overflow-auto p-4 sm:p-6 pt-16 lg:pt-6">{children}</main>
      </div>
      <Footer />
    </>
  );
}
