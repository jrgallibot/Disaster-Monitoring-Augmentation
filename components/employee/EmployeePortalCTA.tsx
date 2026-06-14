import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserCircle, UserPlus, RefreshCw } from "lucide-react";

export function EmployeePortalCTA() {
  return (
    <Card className="border-dswd-blue/30 bg-gradient-to-r from-blue-50 to-white">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <h3 className="font-semibold text-dswd-navy text-lg">
              Augmented Employee? Update Your Status Here
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Sign in or create your account to report deployment status, update your location,
              and keep your monitoring profile current for DSWD augmentation disaster response.
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <li className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 text-dswd-blue" />
                Update status (Deployed / On Standby)
              </li>
              <li className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 text-dswd-blue" />
                Update deployment location
              </li>
              <li className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 text-dswd-blue" />
                Update contact &amp; notes
              </li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Button asChild variant="default">
              <Link href="/employee/login">
                <UserCircle className="h-4 w-4" />
                Employee Sign In
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/employee/register">
                <UserPlus className="h-4 w-4" />
                Create Account
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
