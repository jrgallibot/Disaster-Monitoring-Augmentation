"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SexBreakdown } from "@/components/shared/SexBreakdown";
import type { AdminDashboardExtended } from "@/lib/types";
import {
  Camera,
  Clock,
  LogIn,
  LogOut,
  MapPin,
  Percent,
  UserCheck,
  Users,
} from "lucide-react";

interface AdminExtendedStatsProps {
  extended: AdminDashboardExtended;
}

export function AdminExtendedStats({ extended }: AdminExtendedStatsProps) {
  const cards = [
    {
      title: "Timed In Now",
      value: extended.clockedIn,
      sex: extended.sex.clockedIn,
      sub: "On duty",
      icon: LogIn,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Today's Time In",
      value: extended.todayTimeIn,
      sex: extended.sex.todayTimeIn,
      sub: "Records today",
      icon: Clock,
      color: "text-dswd-blue",
      bg: "bg-blue-50",
    },
    {
      title: "Today's Time Out",
      value: extended.todayTimeOut,
      sex: extended.sex.todayTimeOut,
      sub: "Records today",
      icon: LogOut,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Deployment Rate",
      value: `${extended.deploymentRate}%`,
      sex: null,
      sub: "Deployed / total",
      icon: Percent,
      color: "text-dswd-navy",
      bg: "bg-indigo-50",
    },
    {
      title: "Portal Accounts",
      value: extended.registeredAccounts,
      sex: extended.sex.registeredAccounts,
      sub: "Self-registered",
      icon: UserCheck,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "With Photo",
      value: extended.withPhoto,
      sex: extended.sex.withPhoto,
      sub: "Profile complete",
      icon: Camera,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
    {
      title: "With GPS",
      value: extended.withGps,
      sex: extended.sex.withGps,
      sub: "Location tracked",
      icon: MapPin,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      title: "Monitoring",
      value: "Live",
      sex: null,
      sub: "Auto-refresh 30s",
      icon: Users,
      color: "text-green-700",
      bg: "bg-green-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            {card.sex ? <SexBreakdown count={card.sex} /> : null}
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
