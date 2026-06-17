import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeAuthPanel } from "@/components/employee/EmployeeAuthPanel";
import { SystemLogo } from "@/components/brand/SystemLogo";
import { getPublicLibraryLoadState } from "@/lib/actions/public-libraries";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EmployeeRegisterPage() {
  const { specializations, regions, configured, librariesAvailable } =
    await getPublicLibraryLoadState();

  return (
    <>
      <Header showAdminLink={true} showEmployeeLink={false} />
      <main className="flex-1 bg-dswd-light py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <Card>
            <CardHeader className="text-center border-b border-dswd-border pb-6">
              <SystemLogo variant="stacked" size="lg" className="mx-auto" />
              <CardTitle className="text-2xl mt-4">Create Employee Account</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Link your Employee ID and email to join the QRT monitoring portal
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Registration requires a valid DSWD Employee ID and work email
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              {!configured && (
                <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm">
                  Database connection is not configured yet. Registration is unavailable until
                  Supabase environment variables are set on the server.
                </div>
              )}
              {configured && !librariesAvailable && (
                <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm">
                  Specialization and region libraries are not loaded. Ask your administrator to run
                  database migrations and seed library data in Supabase.
                </div>
              )}
              <EmployeeAuthPanel
                defaultTab="register"
                specializations={specializations}
                regions={regions}
                registrationEnabled={librariesAvailable}
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
