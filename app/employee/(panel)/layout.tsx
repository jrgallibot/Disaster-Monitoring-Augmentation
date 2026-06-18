import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { EmployeeSidebar } from "@/components/employee/EmployeeSidebar";
import { EmployeePanelChrome } from "@/components/employee/EmployeePanelChrome";
import { getAdminPortalAccess, getEmployeeSession, requireEmployeeForPage } from "@/lib/actions/auth";
import {
  getMyNotifications,
  getUnreadNotificationCount,
} from "@/lib/actions/notifications";
import { getTeamLeaderContext } from "@/lib/actions/team-leader";

export default async function EmployeePanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireEmployeeForPage();
  const session = await getEmployeeSession();
  const [teamLeaderContext, adminAccess, unreadCount, initialNotifications] =
    await Promise.all([
      getTeamLeaderContext(),
      getAdminPortalAccess(),
      getUnreadNotificationCount(),
      getMyNotifications(20),
    ]);

  const myEmployeeId = teamLeaderContext.myEmployee?.id ?? null;
  const userId = "error" in session ? null : session.user.id;

  return (
    <>
      <Header showAdminLink={false} showEmployeeLink={false} homeHref="/employee/dashboard" />
      {userId && myEmployeeId && (
        <EmployeePanelChrome
          userId={userId}
          myEmployeeId={myEmployeeId}
          initialNotifications={initialNotifications}
          initialUnreadCount={unreadCount}
        />
      )}
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
