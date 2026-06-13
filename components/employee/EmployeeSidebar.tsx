"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { employeeLogout } from "@/lib/actions/auth";

export function EmployeeSidebar() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
      <nav className="flex-1 p-3">
        <Link
          href="/employee/dashboard"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-dswd-navy hover:bg-dswd-light"
        >
          <LayoutDashboard className="h-4 w-4" />
          My Account
        </Link>
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
