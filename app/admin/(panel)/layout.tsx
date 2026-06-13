import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header showAdminLink={false} />
      <div className="flex flex-1 min-h-0">
        <AdminSidebar />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:ml-0 ml-0 pt-16 lg:pt-6">
          {children}
        </main>
      </div>
      <Footer />
    </>
  );
}
