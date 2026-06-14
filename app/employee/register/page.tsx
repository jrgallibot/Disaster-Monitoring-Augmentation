import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeAuthPanel } from "@/components/employee/EmployeeAuthPanel";
import { getRegions, getSpecializations } from "@/lib/actions/employees";
import { SYSTEM_TAGLINE } from "@/lib/branding";
import { Shield } from "lucide-react";
import Link from "next/link";

export default async function EmployeeRegisterPage() {
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
              <div className="mx-auto h-16 w-16 rounded-full bg-dswd-gold flex items-center justify-center mb-3">
                <Shield className="h-9 w-9 text-white" />
              </div>
              <CardTitle className="text-2xl">Create Employee Account</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Register for the {SYSTEM_TAGLINE.toLowerCase()} portal
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Link your Employee ID and email to start updating your status
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <EmployeeAuthPanel
                defaultTab="register"
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
