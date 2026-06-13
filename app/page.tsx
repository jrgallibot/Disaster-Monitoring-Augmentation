import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { StatusChart } from "@/components/dashboard/StatusChart";
import { RegionChart } from "@/components/dashboard/RegionChart";
import { EmployeeTable } from "@/components/dashboard/EmployeeTable";
import {
  getEmployees,
  getDashboardStats,
  getRegions,
  getStatuses,
  getSpecializations,
} from "@/lib/actions/employees";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let stats = {
    total: 0,
    deployed: 0,
    onStandby: 0,
    onLeave: 0,
    byStatus: [] as { name: string; count: number; color: string }[],
    byRegion: [] as { name: string; code: string; count: number }[],
  };
  let employees: Awaited<ReturnType<typeof getEmployees>> = [];
  let regions: Awaited<ReturnType<typeof getRegions>> = [];
  let statuses: Awaited<ReturnType<typeof getStatuses>> = [];
  let specializations: Awaited<ReturnType<typeof getSpecializations>> = [];
  let dbError = false;

  try {
    [stats, employees, regions, statuses, specializations] = await Promise.all([
      getDashboardStats(),
      getEmployees(),
      getRegions(),
      getStatuses(),
      getSpecializations(),
    ]);
  } catch {
    dbError = true;
  }

  return (
    <>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
        {dbError ? (
          <div className="gov-card p-8 text-center">
            <h2 className="gov-section-title mb-4">System Setup Required</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Connect your Supabase database to view employee monitoring data.
              See the README for setup instructions.
            </p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="gov-section-title">Monitoring Dashboard</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Real-time overview of augmented employees for earthquake disaster response operations.
              </p>
            </div>

            <StatsCards stats={stats} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StatusChart stats={stats} />
              <RegionChart stats={stats} />
            </div>

            <EmployeeTable
              employees={employees}
              regions={regions}
              statuses={statuses}
              specializations={specializations}
            />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
