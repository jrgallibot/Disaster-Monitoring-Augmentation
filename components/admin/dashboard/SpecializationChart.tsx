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
  const chartData = data.slice(0, 8);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>By Specialization</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center text-muted-foreground">
          No specialization data
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employees by Specialization</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value, name) => [value, name === "male" ? "Male" : name === "female" ? "Female" : "Employees"]}
            />
            <Legend />
            <Bar dataKey="male" stackId="sex" fill="#2563EB" name="Male" />
            <Bar dataKey="female" stackId="sex" fill="#DB2777" radius={[0, 4, 4, 0]} name="Female" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
