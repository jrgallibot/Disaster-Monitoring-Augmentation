import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SystemLogo } from "@/components/brand/SystemLogo";
import { SYSTEM_BANNER } from "@/lib/branding";

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
        <span>{SYSTEM_BANNER}</span>
        <span className="hidden sm:inline">Republic of the Philippines</span>
      </div>
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <Link href={homeHref} className="min-w-0 max-w-full sm:max-w-[min(100%,42rem)]">
            <SystemLogo variant="horizontal" size="md" showTagline />
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
