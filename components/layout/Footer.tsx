import Link from "next/link";
import { MapPin } from "lucide-react";
import { SystemLogo } from "@/components/brand/SystemLogo";
import { CREATED_BY, SYSTEM_TAGLINE } from "@/lib/branding";

export function Footer() {
  return (
    <footer className="bg-dswd-navy text-white mt-auto">
      <div className="h-1 bg-gradient-to-r from-dswd-gold via-dswd-blue to-dswd-gold" />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <SystemLogo variant="horizontal" size="sm" inverted className="mb-3" />
            <p className="text-sm text-white/80 leading-relaxed">{SYSTEM_TAGLINE}</p>
          </div>

          <div>
            <p className="font-semibold mb-3">Department of Social Welfare and Development</p>
            <div className="flex items-start gap-2 text-sm text-white/70">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-dswd-gold" />
              <div>
                <p>Quick Response Team deployment and disaster monitoring</p>
              </div>
            </div>
          </div>

          <div className="md:text-right">
            <p className="font-semibold text-dswd-gold mb-2">Quick Access</p>
            <div className="flex flex-col gap-1 text-sm text-white/80 md:items-end">
              <Link href="/" className="hover:text-dswd-gold transition-colors">
                Public Monitoring Dashboard
              </Link>
              <Link href="/employee/login" className="hover:text-dswd-gold transition-colors">
                Employee Self-Service Portal
              </Link>
              <Link href="/admin/login" className="hover:text-dswd-gold transition-colors">
                Administrator Control Panel
              </Link>
            </div>
            <p className="text-xs text-white/50 mt-4">
              System developed by {CREATED_BY}
            </p>
            <p className="text-xs text-white/40 mt-1">
              &copy; {new Date().getFullYear()} Department of Social Welfare and Development
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
