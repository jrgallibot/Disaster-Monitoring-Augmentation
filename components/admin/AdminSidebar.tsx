"use client";

import { SYSTEM_NAME } from "@/lib/branding";
import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X, LayoutDashboard, Users, BookOpen, LogOut, FileText, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import type { PortalRole } from "@/lib/auth/roles";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, writeOnly: false },
  { href: "/admin/reports/daily-operations", label: "Daily Report", icon: FileText, writeOnly: false },
  { href: "/admin/employees", label: "Employees", icon: Users, writeOnly: false },
  { href: "/admin/libraries", label: "Libraries", icon: BookOpen, writeOnly: true },
];

interface AdminSidebarProps {
  canWrite?: boolean;
  portalRole?: PortalRole;
  showEmployeePortalLink?: boolean;
}

function getPortalTitle(portalRole: PortalRole | undefined, canWrite: boolean): string {
  if (canWrite) return "Admin Portal";
  if (portalRole === "team_leader") return "Team Leader Portal";
  return "Co-Admin Portal";
}

export function AdminSidebar({
  canWrite = true,
  portalRole,
  showEmployeePortalLink = false,
}: AdminSidebarProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  function navLinkClass(href: string) {
    const active =
      pathname === href ||
      (href !== "/admin/dashboard" && pathname.startsWith(`${href}/`));
    return cn(
      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
      active ? "bg-dswd-light text-dswd-navy" : "text-dswd-navy hover:bg-dswd-light"
    );
  }

  function handleLogout() {
    startTransition(async () => {
      await logout();
      router.push("/admin/login");
    });
  }

  const portalTitle = getPortalTitle(portalRole, canWrite);

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-dswd-border">
        <h2 className="font-bold text-dswd-navy text-sm">{portalTitle}</h2>
        <p className="text-xs text-muted-foreground mt-1">{SYSTEM_NAME}</p>
        {!canWrite && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
            {portalRole === "team_leader"
              ? "Monitoring view — manage your team in the Employee Portal"
              : "View only — no add, edit, or delete"}
          </p>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems
          .filter((item) => canWrite || !item.writeOnly)
          .map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={navLinkClass(item.href)}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
        {showEmployeePortalLink && (
          <Link
            href="/employee/dashboard"
            onClick={() => setOpen(false)}
            className={navLinkClass("/employee/dashboard")}
          >
            <UserCircle className="h-4 w-4" />
            My Employee Account
          </Link>
        )}
      </nav>
      <div className="p-3 border-t border-dswd-border space-y-2">
        {showEmployeePortalLink && (
          <Button asChild variant="default" size="sm" className="w-full">
            <Link href="/employee/dashboard" onClick={() => setOpen(false)}>
              <UserCircle className="h-4 w-4" />
              Open Employee Portal
            </Link>
          </Button>
        )}
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 text-xs text-dswd-blue hover:underline"
        >
          View Public Dashboard
        </Link>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleLogout}
          disabled={isPending}
        >
          <LogOut className="h-4 w-4" />
          {isPending ? "Signing out..." : "Sign Out"}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <button
        className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-white border border-dswd-border rounded-md shadow-sm"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-dswd-border transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </aside>
    </>
  );
}
