"use client";

import { SYSTEM_NAME } from "@/lib/branding";
import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X, LayoutDashboard, Users, BookOpen, LogOut, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/reports/daily-operations", label: "Daily Report", icon: FileText },
  { href: "/admin/employees", label: "Employees", icon: Users },
  { href: "/admin/libraries", label: "Libraries", icon: BookOpen },
];

export function AdminSidebar() {
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

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-dswd-border">
        <h2 className="font-bold text-dswd-navy text-sm">Admin Portal</h2>
        <p className="text-xs text-muted-foreground mt-1">{SYSTEM_NAME}</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
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
      </nav>
      <div className="p-3 border-t border-dswd-border space-y-2">
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
