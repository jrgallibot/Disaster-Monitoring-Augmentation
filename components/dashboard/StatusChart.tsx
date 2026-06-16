"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { DashboardStats } from "@/lib/types";

interface StatusChartProps {
  stats: DashboardStats;
}

export function StatusChart({ stats }: StatusChartProps) {
  const data = stats.byStatus.map((s) => ({
    name: s.name,
    value: s.count,
    color: s.color,
    male: s.male,
    female: s.female,
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center text-muted-foreground">
          No employee data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => {
                const payload = item?.payload as { male?: number; female?: number } | undefined;
                return [
                  `Total: ${value} (M: ${payload?.male ?? 0}, F: ${payload?.female ?? 0})`,
                  "Employees",
                ];
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-dswd-border text-left">
                <th className="py-2 pr-3 font-semibold text-dswd-navy">Status</th>
                <th className="py-2 pr-3 font-semibold text-dswd-navy">Total</th>
                <th className="py-2 pr-3 font-semibold text-dswd-navy">Male</th>
                <th className="py-2 font-semibold text-dswd-navy">Female</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.name} className="border-b border-dswd-border/60">
                  <td className="py-2 pr-3">{row.name}</td>
                  <td className="py-2 pr-3">{row.value}</td>
                  <td className="py-2 pr-3">{row.male}</td>
                  <td className="py-2">{row.female}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
