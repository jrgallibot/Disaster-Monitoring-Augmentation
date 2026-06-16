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

interface SpecializationChartProps {
  data: { name: string; count: number; male: number; female: number }[];
}

export function SpecializationChart({ data }: SpecializationChartProps) {
  const chartData = data;

  const totals = chartData.reduce(
    (acc, row) => ({
      count: acc.count + row.count,
      male: acc.male + row.male,
      female: acc.female + row.female,
    }),
    { count: 0, male: 0, female: 0 }
  );

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Employees by Specialization</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center text-muted-foreground">
          No specialization data
        </CardContent>
      </Card>
    );
  }

  const chartHeight = Math.min(Math.max(280, chartData.length * 36), 480);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employees by Specialization</CardTitle>
        <p className="text-sm text-muted-foreground">
          {chartData.length} specialization{chartData.length === 1 ? "" : "s"} · {totals.count}{" "}
          employee{totals.count === 1 ? "" : "s"} total
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value, name) => [
                value,
                name === "male" ? "Male" : name === "female" ? "Female" : String(name),
              ]}
            />
            <Legend />
            <Bar dataKey="male" stackId="sex" fill="#2563EB" name="Male" />
            <Bar dataKey="female" stackId="sex" fill="#DB2777" radius={[0, 4, 4, 0]} name="Female" />
          </BarChart>
        </ResponsiveContainer>

        <div className="overflow-x-auto rounded-lg border border-dswd-border">
          <table className="w-full text-sm">
            <thead className="bg-dswd-light">
              <tr className="border-b border-dswd-border text-left">
                <th className="py-2 px-3 font-semibold text-dswd-navy w-10">#</th>
                <th className="py-2 px-3 font-semibold text-dswd-navy">Specialization</th>
                <th className="py-2 px-3 font-semibold text-dswd-navy text-right">Total</th>
                <th className="py-2 px-3 font-semibold text-dswd-navy text-right">Male</th>
                <th className="py-2 px-3 font-semibold text-dswd-navy text-right">Female</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, index) => (
                <tr key={row.name} className="border-b border-dswd-border/60 hover:bg-dswd-light/50">
                  <td className="py-2 px-3 text-muted-foreground">{index + 1}</td>
                  <td className="py-2 px-3 font-medium text-dswd-navy">{row.name}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{row.count}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{row.male}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{row.female}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-dswd-light/80">
              <tr className="border-t border-dswd-border font-semibold text-dswd-navy">
                <td className="py-2 px-3" colSpan={2}>
                  Total
                </td>
                <td className="py-2 px-3 text-right tabular-nums">{totals.count}</td>
                <td className="py-2 px-3 text-right tabular-nums">{totals.male}</td>
                <td className="py-2 px-3 text-right tabular-nums">{totals.female}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
