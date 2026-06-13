"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { employeeLogout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

interface EmployeeSidebarProps {
  showTeamLink?: boolean;
}

export function EmployeeSidebar({ showTeamLink = false }: EmployeeSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const navLinkClass = (href: string) =>
    cn(
      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium",
      pathname === href || pathname.startsWith(`${href}/`)
        ? "bg-dswd-light text-dswd-navy"
        : "text-dswd-navy hover:bg-dswd-light"
    );

  function handleLogout() {
    startTransition(async () => {
      await employeeLogout();
      router.push("/employee/login");
    });
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-dswd-border">
        <h2 className="font-bold text-dswd-navy text-sm">Employee Portal</h2>
        <p className="text-xs text-muted-foreground mt-1">Caraga Region XIII</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        <Link
          href="/employee/dashboard"
          onClick={() => setOpen(false)}
          className={navLinkClass("/employee/dashboard")}
        >
          <LayoutDashboard className="h-4 w-4" />
          My Account
        </Link>
        {showTeamLink && (
          <Link
            href="/employee/team"
            onClick={() => setOpen(false)}
            className={navLinkClass("/employee/team")}
          >
            <Users className="h-4 w-4" />
            My Team
          </Link>
        )}
      </nav>
      <div className="p-3 border-t border-dswd-border">
        <Button variant="outline" size="sm" className="w-full" onClick={handleLogout} disabled={isPending}>
          <LogOut className="h-4 w-4" />
          {isPending ? "Signing out..." : "Sign Out"}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <button
        className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-white border rounded-md shadow-sm"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-dswd-border transform transition-transform lg:translate-x-0 lg:static ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </aside>
    </>
  );
}
