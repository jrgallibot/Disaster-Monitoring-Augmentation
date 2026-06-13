export function Footer() {
  return (
    <footer className="bg-dswd-navy text-white mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
          <div className="text-center sm:text-left">
            <p className="font-semibold">Department of Social Welfare and Development</p>
            <p className="text-white/70 text-xs mt-1">
              Batasan Complex, Quezon City, Philippines
            </p>
          </div>
          <div className="text-center sm:text-right text-white/70 text-xs">
            <p>Earthquake Augmentation Employee Monitoring System</p>
            <p className="mt-1">&copy; {new Date().getFullYear()} DSWD. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
