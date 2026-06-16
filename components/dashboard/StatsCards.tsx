"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, Clock, AlertCircle } from "lucide-react";
import { SexBreakdown } from "@/components/shared/SexBreakdown";
import type { DashboardStats } from "@/lib/types";

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Employees",
      value: stats.total,
      sex: stats.sex.total,
      icon: Users,
      color: "text-dswd-navy",
      bg: "bg-blue-50",
    },
    {
      title: "Deployed",
      value: stats.deployed,
      sex: stats.sex.deployed,
      icon: MapPin,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "On Standby",
      value: stats.onStandby,
      sex: stats.sex.onStandby,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "On Leave",
      value: stats.onLeave,
      sex: stats.sex.onLeave,
      icon: AlertCircle,
      color: "text-gray-600",
      bg: "bg-gray-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
            <SexBreakdown count={card.sex} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
