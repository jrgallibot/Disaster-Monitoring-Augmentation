import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, MapPin, User } from "lucide-react";
import { getEmployeeById } from "@/lib/actions/employees";
import { formatDate, getFullName } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const employee = await getEmployeeById(id);

  if (!employee) notFound();

  return (
    <>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-dswd-blue hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="h-20 w-20 rounded-full bg-dswd-light flex items-center justify-center shrink-0">
                <User className="h-10 w-10 text-dswd-navy" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl">
                  {getFullName(employee.first_name, employee.last_name, employee.middle_name)}
                </CardTitle>
                <p className="text-sm font-mono text-muted-foreground mt-1">
                  {employee.employee_id}
                </p>
                {employee.status && (
                  <Badge color={employee.status.color} className="mt-3 text-sm px-3 py-1">
                    {employee.status.name}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem label="Specialization" value={employee.specialization?.name} />
              <InfoItem label="Region" value={employee.region ? `${employee.region.name} (${employee.region.code})` : undefined} />
              <InfoItem label="Deployment Location" value={employee.deployment_location} icon={<MapPin className="h-4 w-4" />} />
            </div>

            <div className="border-t border-dswd-border pt-4">
              <h3 className="font-semibold text-dswd-navy mb-3">Contact Information</h3>
              <div className="space-y-2 text-sm">
                {employee.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${employee.email}`} className="text-dswd-blue hover:underline">
                      {employee.email}
                    </a>
                  </p>
                )}
                {employee.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {employee.phone}
                  </p>
                )}
                {employee.address && (
                  <p className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    {employee.address}
                  </p>
                )}
              </div>
            </div>

            {employee.notes && (
              <div className="border-t border-dswd-border pt-4">
                <h3 className="font-semibold text-dswd-navy mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground">{employee.notes}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground border-t border-dswd-border pt-4">
              Last updated: {formatDate(employee.updated_at)}
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}

function InfoItem({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-medium text-dswd-navy mt-1 flex items-center gap-2">
        {icon}
        {value ?? "—"}
      </p>
    </div>
  );
}
