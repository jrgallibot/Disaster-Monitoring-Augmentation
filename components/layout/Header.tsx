import Link from "next/link";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  showAdminLink?: boolean;
  showEmployeeLink?: boolean;
  homeHref?: string;
}

export function Header({
  showAdminLink = true,
  showEmployeeLink = true,
  homeHref = "/",
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-dswd-border shadow-sm">
      <div className="gov-banner flex items-center justify-between">
        <span>DSWD — Caraga Region XIII Innovation | Disaster Response Monitoring</span>
        <span className="hidden sm:inline">Republic of the Philippines</span>
      </div>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link href={homeHref} className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-dswd-navy text-white">
              <Shield className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-dswd-navy leading-tight truncate">
                DSWD Augmented Employee Monitoring
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Caraga Region XIII — Earthquake Augmentation Program
              </p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {showEmployeeLink && (
              <>
                <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                  <Link href="/employee/register">Register</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/employee/login">Employee Login</Link>
                </Button>
              </>
            )}
            {showAdminLink && (
              <Link
                href="/admin/login"
                className="text-sm font-medium text-dswd-navy hover:underline hidden md:inline"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="h-1 bg-gradient-to-r from-dswd-navy via-dswd-blue to-dswd-gold" />
    </header>
  );
}
