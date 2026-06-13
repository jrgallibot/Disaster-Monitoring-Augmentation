import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { StatusChart } from "@/components/dashboard/StatusChart";
import { RegionChart } from "@/components/dashboard/RegionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, BookOpen } from "lucide-react";
import { getDashboardStats, getEmployees } from "@/lib/actions/employees";
import { formatDate, getFullName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [stats, employees] = await Promise.all([
    getDashboardStats(),
    getEmployees(),
  ]);

  const recent = employees.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="gov-section-title">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Overview of augmented employee deployment status
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/employees/new">
              <Plus className="h-4 w-4" />
              Add Employee
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/libraries">
              <BookOpen className="h-4 w-4" />
              Libraries
            </Link>
          </Button>
        </div>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusChart stats={stats} />
        <RegionChart stats={stats} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recently Updated Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recent.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-3 border border-dswd-border rounded-lg"
              >
                <div>
                  <Link
                    href={`/admin/employees/${emp.id}/edit`}
                    className="font-medium text-dswd-blue hover:underline"
                  >
                    {getFullName(emp.first_name, emp.last_name, emp.middle_name)}
                  </Link>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {emp.employee_id}
                  </p>
                </div>
                <div className="text-right">
                  {emp.status && (
                    <Badge color={emp.status.color}>{emp.status.name}</Badge>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(emp.updated_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
