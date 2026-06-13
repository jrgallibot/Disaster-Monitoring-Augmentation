import { MapPin, Lightbulb } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-dswd-navy text-white mt-auto">
      <div className="h-1 bg-gradient-to-r from-dswd-gold via-dswd-blue to-dswd-gold" />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-5 w-5 text-dswd-gold" />
              <p className="font-bold text-dswd-gold">Caraga Region XIII Innovation</p>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">
              Advancing disaster response through digital monitoring and augmented employee
              deployment tracking for the DSWD earthquake augmentation program.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-3">Department of Social Welfare and Development</p>
            <div className="flex items-start gap-2 text-sm text-white/70">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-dswd-gold" />
              <div>
                <p>DSWD Field Office — Caraga</p>
                <p>Region XIII, Philippines</p>
                <p className="mt-1">Earthquake Augmentation Employee Monitoring System</p>
              </div>
            </div>
          </div>

          <div className="md:text-right">
            <p className="font-semibold text-dswd-gold mb-2">Quick Access</p>
            <div className="flex flex-col gap-1 text-sm text-white/80 md:items-end">
              <span>Public Monitoring Dashboard</span>
              <span>Employee Self-Service Portal</span>
              <span>Administrator Control Panel</span>
            </div>
            <p className="text-xs text-white/50 mt-4">
              &copy; {new Date().getFullYear()} DSWD Caraga Region XIII. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
