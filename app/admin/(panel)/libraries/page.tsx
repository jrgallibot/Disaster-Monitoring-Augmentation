import { LibraryManager } from "@/components/admin/LibraryManager";
import { getAllLibraries } from "@/lib/actions/employees";

export const dynamic = "force-dynamic";

export default async function AdminLibrariesPage() {
  const { specializations, regions, statuses } = await getAllLibraries();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gov-section-title">Dynamic Libraries</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Manage dropdown options for specializations, regions, and deployment statuses.
          Changes apply immediately to employee forms.
        </p>
      </div>
      <LibraryManager
        specializations={specializations}
        regions={regions}
        statuses={statuses}
      />
    </div>
  );
}
