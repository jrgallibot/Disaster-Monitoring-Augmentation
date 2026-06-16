"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DashboardStats } from "@/lib/types";

interface RegionChartProps {
  stats: DashboardStats;
}

export function RegionChart({ stats }: RegionChartProps) {
  const data = stats.byRegion.slice(0, 10).map((r) => ({
    name: r.code,
    fullName: r.name,
    count: r.count,
    male: r.male,
    female: r.female,
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Employees by Region</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center text-muted-foreground">
          No regional data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employees by Region</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value, name) => [
                value,
                name === "male" ? "Male" : name === "female" ? "Female" : String(name),
              ]}
              labelFormatter={(_label, payload) => {
                const row = (payload as { payload?: { fullName?: string } }[] | undefined)?.[0]
                  ?.payload;
                return row?.fullName ?? "";
              }}
            />
            <Legend />
            <Bar dataKey="male" stackId="sex" fill="#2563EB" radius={[0, 0, 0, 0]} name="Male" />
            <Bar dataKey="female" stackId="sex" fill="#DB2777" radius={[4, 4, 0, 0]} name="Female" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
