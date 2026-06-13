import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/admin/LoginForm";
import { Shield } from "lucide-react";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-dswd-light">
      <div className="gov-banner text-center">DSWD Admin Portal</div>
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-dswd-navy flex items-center justify-center mb-2">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <CardTitle>Administrator Login</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to manage augmented employees
            </p>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
