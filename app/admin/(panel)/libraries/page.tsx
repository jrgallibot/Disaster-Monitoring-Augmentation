import { LibraryManager } from "@/components/admin/LibraryManager";
import { getAllLibraries, getEmployees } from "@/lib/actions/employees";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminLibrariesPage() {
  try {
    const [{ specializations, regions, statuses }, employees] = await Promise.all([
      getAllLibraries(),
      getEmployees(),
    ]);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="gov-section-title">Dynamic Libraries</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage dropdown options for specializations, regions, and deployment statuses.
            Assign a team leader employee per region under the Regions tab. Team leaders use their employee account to monitor members.
          </p>
        </div>
        <LibraryManager
          specializations={specializations}
          regions={regions}
          statuses={statuses}
          employees={employees}
        />
      </div>
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load libraries";
    return (
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-red-700 mb-2">Unable to load libraries</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Ensure you are logged in as admin and{" "}
            <code className="bg-gray-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            is set in Vercel environment variables, then redeploy.
          </p>
        </CardContent>
      </Card>
    );
  }
}
