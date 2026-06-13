import Link from "next/link";
import { Shield } from "lucide-react";

interface HeaderProps {
  showAdminLink?: boolean;
}

export function Header({ showAdminLink = true }: HeaderProps) {
  return (
    <header className="bg-white border-b border-dswd-border shadow-sm">
      <div className="gov-banner flex items-center justify-between">
        <span>An official website of the Department of Social Welfare and Development</span>
        <span className="hidden sm:inline">Republic of the Philippines</span>
      </div>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-dswd-navy text-white">
              <Shield className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-dswd-navy leading-tight truncate">
                DSWD Augmented Employee Monitoring
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Earthquake Augmentation Program — Disaster Response
              </p>
            </div>
          </Link>
          {showAdminLink && (
            <Link
              href="/admin/login"
              className="shrink-0 text-sm font-medium text-dswd-blue hover:underline"
            >
              Admin Portal
            </Link>
          )}
        </div>
      </div>
      <div className="h-1 bg-gradient-to-r from-dswd-navy via-dswd-blue to-dswd-gold" />
    </header>
  );
}
