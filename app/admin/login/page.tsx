import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/admin/LoginForm";
import { SystemLogo } from "@/components/brand/SystemLogo";
import { SYSTEM_NAME } from "@/lib/branding";

interface AdminLoginPageProps {
  searchParams?: { error?: string };
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const error = searchParams?.error;
  const initialError =
    error === "access_denied"
      ? "Access denied. Sign in with an administrator, co-administrator, or team leader account."
      : error === "read_only"
        ? "That page is not available in view-only mode. Team leaders and co-admins cannot add or edit records here."
        : null;

  return (
    <div className="min-h-screen flex flex-col bg-dswd-light">
      <div className="gov-banner text-center">Admin Portal — {SYSTEM_NAME}</div>
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center border-b border-dswd-border pb-6">
            <SystemLogo variant="stacked" size="lg" className="mx-auto" />
            <CardTitle className="mt-4">Admin & Monitoring Login</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in as administrator, co-admin, or team leader
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            <LoginForm initialError={initialError} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
