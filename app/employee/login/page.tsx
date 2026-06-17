import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeAuthPanel } from "@/components/employee/EmployeeAuthPanel";
import { SystemLogo } from "@/components/brand/SystemLogo";
import { getPublicLibraryLoadState } from "@/lib/actions/public-libraries";
import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  not_employee:
    "Your account is not registered as an employee. Please register with your DSWD Employee ID or contact your administrator.",
};

interface PageProps {
  searchParams?: { error?: string };
}

export const dynamic = "force-dynamic";

export default async function EmployeeLoginPage({ searchParams }: PageProps) {
  const error = searchParams?.error;
  const errorMessage = error ? ERROR_MESSAGES[error] : null;
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
              <CardTitle className="text-2xl mt-4">Employee Portal</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Sign in to update deployment status and submit daily reports
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              {!configured && (
                <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm">
                  Database connection is not configured yet. You can still open this page, but
                  registration requires Supabase environment variables on the server.
                </div>
              )}
              {configured && !librariesAvailable && (
                <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm">
                  Specialization and region libraries are not available yet. Sign in may still work
                  if you already have an account. Contact your administrator to complete system
                  setup.
                </div>
              )}
              {errorMessage && (
                <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm">
                  {errorMessage}
                </div>
              )}
              <EmployeeAuthPanel
                defaultTab="login"
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
