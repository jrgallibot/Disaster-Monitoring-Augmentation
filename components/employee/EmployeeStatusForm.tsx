"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminDeploymentUpdateDialog } from "@/components/admin/AdminDeploymentUpdateDialog";
import { MobilizationUpdateDialog } from "@/components/shared/MobilizationUpdateDialog";
import { MobilizationStatusBadge } from "@/components/shared/MobilizationStatusBadge";
import { EmployeeActivityLogs } from "@/components/employee/EmployeeActivityLogs";
import { EmployeeDeploymentHistory } from "@/components/employee/EmployeeDeploymentHistory";
import { updateMyEmployee, uploadMyProfilePhoto } from "@/lib/actions/employee-portal";
import { toast } from "@/lib/toast";
import { DEPLOYMENT_DAILY_RESET_NOTICE } from "@/lib/deployment-daily";
import { formatMobilizationDate } from "@/lib/mobilization";
import { formatCoordinates, getCurrentPosition, getMapUrl, hasValidCoordinates } from "@/lib/geo";
import { formatDate, getEmployeeTeamLeader, getAutoAssignedTeamLeaderId, getRegionTeamLeaderSummaries, getTeamLeaderDisplay, shouldSelectTeamLeader } from "@/lib/utils";
import type {
  EmployeeDeploymentLog,
  EmployeeUpdateLog,
  EmployeeWithRelations,
  LibraryRegion,
  LibrarySpecialization,
  LibraryStatus,
} from "@/lib/types";
import { Briefcase, Camera, MapPin, MessageSquare, UserCheck } from "lucide-react";

interface EmployeeStatusFormProps {
  employee: EmployeeWithRelations;
  specializations: LibrarySpecialization[];
  regions: LibraryRegion[];
  statuses: LibraryStatus[];
  logs: EmployeeUpdateLog[];
  deploymentLogs: EmployeeDeploymentLog[];
}

export function EmployeeStatusForm({
  employee: initialEmployee,
  specializations,
  regions,
  statuses,
  logs,
  deploymentLogs,
}: EmployeeStatusFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [employee, setEmployee] = useState(initialEmployee);
  const [showDeploymentDialog, setShowDeploymentDialog] = useState(false);
  const [showMobilizationDialog, setShowMobilizationDialog] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [specializationId, setSpecializationId] = useState(employee.specialization_id ?? "");
  const [regionId, setRegionId] = useState(employee.region_id ?? "");

  useEffect(() => {
    setEmployee(initialEmployee);
  }, [initialEmployee]);

  function handleDeploymentUpdated(updated: EmployeeWithRelations) {
    setEmployee(updated);
    router.refresh();
  }

  function handleMobilizationUpdated(updated: EmployeeWithRelations) {
    setEmployee(updated);
    router.refresh();
  }
  const selectedRegion = useMemo(
    () => regions.find((region) => region.id === regionId) ?? employee.region,
    [regionId, regions, employee.region]
  );
  const regionLeaders = useMemo(
    () => getRegionTeamLeaderSummaries(selectedRegion),
    [selectedRegion]
  );
  const needsTeamLeaderSelection = shouldSelectTeamLeader(selectedRegion);
  const [assignedTeamLeaderId, setAssignedTeamLeaderId] = useState(
    employee.assigned_team_leader_id ??
      getAutoAssignedTeamLeaderId(selectedRegion) ??
      ""
  );
  const [photoUrl, setPhotoUrl] = useState(employee.photo_url ?? "");
  const [photoPreview, setPhotoPreview] = useState(employee.photo_url ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    employee.last_latitude != null && employee.last_longitude != null
      ? { latitude: employee.last_latitude, longitude: employee.last_longitude }
      : null
  );

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError(null);
  }

  function handleRegionChange(value: string) {
    setRegionId(value);
    const nextRegion = regions.find((region) => region.id === value);
    const autoLeaderId = getAutoAssignedTeamLeaderId(nextRegion);
    setAssignedTeamLeaderId(autoLeaderId ?? "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!photoUrl && !photoFile) {
      const message = "Profile photo is required. Please upload your photo.";
      setError(message);
      toast.error(message);
      return;
    }

    if (needsTeamLeaderSelection && !assignedTeamLeaderId) {
      const message = "Please select your team leader for this region.";
      setError(message);
      toast.error(message);
      return;
    }

    const form = new FormData(e.currentTarget);

    const position = await getCurrentPosition();
    if (position) setCoords(position);

    startTransition(async () => {
      let finalPhotoUrl = photoUrl;

      if (photoFile) {
        const uploadData = new FormData();
        uploadData.set("photo", photoFile);
        const uploadResult = await uploadMyProfilePhoto(uploadData);
        if (!uploadResult.success) {
          setError(uploadResult.error);
          toast.error(uploadResult.error);
          return;
        }
        finalPhotoUrl = uploadResult.url ?? "";
        setPhotoUrl(finalPhotoUrl);
        setPhotoFile(null);
      }

      const result = await updateMyEmployee({
        first_name: (form.get("first_name") as string) || undefined,
        last_name: (form.get("last_name") as string) || undefined,
        middle_name: (form.get("middle_name") as string) || undefined,
        specialization_id: specializationId || undefined,
        region_id: regionId || undefined,
        assigned_team_leader_id: assignedTeamLeaderId || undefined,
        phone: (form.get("phone") as string) || undefined,
        address: (form.get("address") as string) || undefined,
        photo_url: finalPhotoUrl || undefined,
        latitude: position?.latitude,
        longitude: position?.longitude,
      });

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Your profile has been updated successfully.");
      router.refresh();
    });
  }

  const teamLeader = getEmployeeTeamLeader({
    ...employee,
    region: selectedRegion ?? employee.region,
  });
  const deploymentPending = employee.deploymentPending ?? false;

  return (
    <div className="space-y-6">
      {deploymentPending && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Today&apos;s deployment status is not set yet.</p>
          <p className="mt-1 text-amber-800">{DEPLOYMENT_DAILY_RESET_NOTICE}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Augmentation Status
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Your mobilization lifecycle — separate from daily deployment status.
              </p>
            </div>
            <MobilizationStatusBadge status={employee.mobilization_status ?? "mobilized"} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <UserCheck className="h-4 w-4 shrink-0" />
            Mobilized:{" "}
            <span className="font-medium text-foreground">
              {formatMobilizationDate(employee.mobilized_at)}
            </span>
          </p>
          {employee.demobilized_at && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <UserCheck className="h-4 w-4 shrink-0" />
              Demobilized:{" "}
              <span className="font-medium text-foreground">
                {formatMobilizationDate(employee.demobilized_at)}
              </span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMobilizationDialog(true)}
            >
              <UserCheck className="h-4 w-4" />
              Update Augmentation Status
            </Button>
            <p className="text-xs text-muted-foreground">
              Set when you mobilized and when you demobilized from augmentation duty.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full overflow-hidden bg-dswd-light border border-dswd-border flex items-center justify-center shrink-0">
                {photoPreview ? (
                  <Image
                    src={photoPreview}
                    alt="Profile"
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <Camera className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="text-xl">My Profile</CardTitle>
                <p className="text-sm font-mono text-muted-foreground mt-1">{employee.employee_id}</p>
              </div>
            </div>
            {employee.status ? (
              <button
                type="button"
                onClick={() => setShowDeploymentDialog(true)}
                className="inline-flex"
                title="Click to update deployment status"
              >
                <Badge color={employee.status.color} className="w-fit cursor-pointer hover:opacity-90">
                  {employee.status.name}
                </Badge>
              </button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeploymentDialog(true)}
              >
                <Briefcase className="h-4 w-4" />
                {deploymentPending ? "Set Today's Deployment" : "Set Deployment Status"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Last updated: {formatDate(employee.updated_at)}
          </p>
          {teamLeader && (
            <p className="text-sm text-muted-foreground">
              Team Leader: <span className="font-medium text-foreground">{teamLeader}</span>
              <span className="text-xs"> (from {employee.region?.name ?? "home region"})</span>
            </p>
          )}
          {needsTeamLeaderSelection && !teamLeader && (
            <p className="text-sm text-amber-700">
              Your region has multiple team leaders. Please select yours below.
            </p>
          )}
          {employee.actual_task && (
            <p className="text-sm text-muted-foreground">
              Actual Task: <span className="font-medium text-foreground">{employee.actual_task}</span>
            </p>
          )}
          {employee.deployment_location && (
            <p className="text-sm text-muted-foreground flex items-start gap-1">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Deployment Location:{" "}
                <span className="font-medium text-foreground">{employee.deployment_location}</span>
              </span>
            </p>
          )}
          {employee.deployment_remarks && (
            <p className="text-sm text-muted-foreground flex items-start gap-1">
              <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Remarks:{" "}
                <span className="font-medium text-foreground">{employee.deployment_remarks}</span>
              </span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeploymentDialog(true)}
            >
              <Briefcase className="h-4 w-4" />
              {deploymentPending ? "Set Today's Deployment" : "Update Deployment"}
            </Button>
            <p className="text-xs text-muted-foreground">
              {deploymentPending
                ? "Set your deployment status for today before starting duty."
                : "Update your deployment status, actual task, and location when assigned."}
            </p>
          </div>
          {coords && hasValidCoordinates(coords.latitude, coords.longitude) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
              <MapPin className="h-3 w-3 shrink-0" />
              Last detected location:{" "}
              <a
                href={getMapUrl(coords.latitude, coords.longitude)!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-dswd-blue hover:underline font-medium"
              >
                {formatCoordinates(coords.latitude, coords.longitude)}
              </a>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Update My Profile</CardTitle>
          <p className="text-sm text-muted-foreground">
            Profile photo is required. Your location is detected automatically when you save.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="photo">Profile Photo *</Label>
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="h-24 w-24 rounded-lg overflow-hidden bg-dswd-light border border-dswd-border flex items-center justify-center">
                  {photoPreview ? (
                    <Image
                      src={photoPreview}
                      alt="Profile preview"
                      width={96}
                      height={96}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    ref={fileInputRef}
                    id="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handlePhotoChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, WEBP, or GIF. Max 5MB. Required for monitoring identification.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  defaultValue={employee.first_name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input
                  id="middle_name"
                  name="middle_name"
                  defaultValue={employee.middle_name ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  defaultValue={employee.last_name}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Specialization *</Label>
                <Select value={specializationId} onValueChange={setSpecializationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {specializations.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Home Region *</Label>
                <Select value={regionId} onValueChange={handleRegionChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {regionLeaders.length > 0 && (
              <div className="space-y-2">
                <Label>Team Leader *</Label>
                {needsTeamLeaderSelection ? (
                  <Select
                    value={assignedTeamLeaderId}
                    onValueChange={setAssignedTeamLeaderId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your team leader" />
                    </SelectTrigger>
                    <SelectContent>
                      {regionLeaders.map((leader) => (
                        <SelectItem key={leader.id} value={leader.id}>
                          {getTeamLeaderDisplay(leader)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={getTeamLeaderDisplay(regionLeaders[0]) ?? ""}
                    readOnly
                    className="bg-dswd-light"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  {needsTeamLeaderSelection
                    ? "Choose the team leader assigned to monitor you in this region."
                    : "Your team leader is assigned automatically for this region."}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={employee.phone ?? ""}
                  placeholder="09XX XXX XXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" defaultValue={employee.address ?? ""} />
              </div>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              GPS coordinates are captured when you save (allow location access in your browser).
            </p>

            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <EmployeeActivityLogs logs={logs} />

      <EmployeeDeploymentHistory employee={employee} logs={deploymentLogs} statuses={statuses} />

      <AdminDeploymentUpdateDialog
        employee={showDeploymentDialog ? employee : null}
        statuses={statuses}
        onClose={() => setShowDeploymentDialog(false)}
        onUpdated={handleDeploymentUpdated}
      />

      <MobilizationUpdateDialog
        employee={showMobilizationDialog ? employee : null}
        onClose={() => setShowMobilizationDialog(false)}
        onUpdated={handleMobilizationUpdated}
      />
    </div>
  );
}
