import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-dswd-light">
      <h1 className="text-4xl font-bold text-dswd-navy">404</h1>
      <p className="text-muted-foreground mt-2 mb-6">Page not found</p>
      <Button asChild>
        <Link href="/">Return to Dashboard</Link>
      </Button>
    </div>
  );
}
