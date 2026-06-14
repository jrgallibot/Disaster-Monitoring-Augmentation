import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PublicDashboardPanel } from "@/components/dashboard/PublicDashboardPanel";
import {
  getPublicDashboardData,
  getPublicOperationsReportData,
} from "@/lib/actions/public-dashboard";
import {
  getRegions,
  getSpecializations,
  getStatuses,
} from "@/lib/actions/employees";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const [dashboardData, operationsReport, regions, statuses, specializations] =
      await Promise.all([
        getPublicDashboardData(),
        getPublicOperationsReportData(),
        getRegions(),
        getStatuses(),
        getSpecializations(),
      ]);

    return (
      <>
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6">
          <PublicDashboardPanel
            initialData={dashboardData}
            operationsReport={operationsReport}
            regions={regions}
            statuses={statuses}
            specializations={specializations}
          />
        </main>
        <Footer />
      </>
    );
  } catch {
    return (
      <>
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6">
          <div className="gov-card p-8 text-center max-w-lg mx-auto">
            <h2 className="gov-section-title mb-4">System Setup Required</h2>
            <p className="text-muted-foreground">
              Connect your Supabase database to view employee monitoring data.
              See the README for setup instructions.
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }
}
