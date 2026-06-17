import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeAuthPanel } from "@/components/employee/EmployeeAuthPanel";
import { SystemLogo } from "@/components/brand/SystemLogo";
import { getRegions, getSpecializations } from "@/lib/actions/employees";
import Link from "next/link";

export default async function EmployeePortalPage() {
  const [specializations, regions] = await Promise.all([
    getSpecializations(),
    getRegions(),
  ]);

  return (
    <>
      <Header showAdminLink={true} showEmployeeLink={false} />
      <main className="flex-1 bg-dswd-light py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <Card>
            <CardHeader className="text-center border-b border-dswd-border pb-6">
              <SystemLogo variant="stacked" size="lg" className="mx-auto" />
              <CardTitle className="text-2xl mt-4">Employee Portal</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Sign in or register to update your deployment status for real-time monitoring
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <EmployeeAuthPanel
                defaultTab="login"
                specializations={specializations}
                regions={regions}
              />
              <p className="text-center text-xs text-muted-foreground mt-6">
                <Link href="/" className="text-dswd-blue hover:underline">
                  ← Back to public monitoring dashboard
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
