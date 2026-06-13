"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { employeeRegister } from "@/lib/actions/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LibraryRegion, LibrarySpecialization } from "@/lib/types";

interface EmployeeRegisterFormProps {
  specializations: LibrarySpecialization[];
  regions: LibraryRegion[];
  onSwitchToLogin?: () => void;
}

export function EmployeeRegisterForm({
  specializations,
  regions,
  onSwitchToLogin,
}: EmployeeRegisterFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [specializationId, setSpecializationId] = useState("");
  const [regionId, setRegionId] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);
    formData.set("specialization_id", specializationId);
    formData.set("region_id", regionId);

    if (!specializationId) {
      setError("Please select your specialization.");
      return;
    }
    if (!regionId) {
      setError("Please select your home region.");
      return;
    }

    startTransition(async () => {
      const result = await employeeRegister(formData);
      if (!result.success) {
        if (result.error.includes("check your email")) {
          setSuccess(result.error);
        } else {
          setError(result.error);
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
          {success}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="employee_id">DSWD Employee ID *</Label>
        <Input
          id="employee_id"
          name="employee_id"
          placeholder="16-11661"
          required
        />
        <p className="text-xs text-muted-foreground">
          Enter your DSWD Employee ID to create your portal account.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Official Email Address *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="your.email@dswd.gov.ph"
          required
          autoComplete="email"
        />
        <p className="text-xs text-muted-foreground">
          Use your official or personal email for sign-in.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Specialization *</Label>
          <Select value={specializationId} onValueChange={setSpecializationId} required>
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
          <Select value={regionId} onValueChange={setRegionId} required>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Min. 6 characters"
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirm Password *</Label>
          <Input
            id="confirm_password"
            name="confirm_password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="p-3 bg-dswd-light rounded-md text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-dswd-navy">After registration you can:</p>
        <p>• Update your profile, specialization, and region</p>
        <p>• Set your status to Deployed or On Standby</p>
        <p>• Update deployment location, phone, and address</p>
      </div>

      <Button type="submit" className="w-full" variant="gold" disabled={isPending}>
        {isPending ? "Creating account..." : "Create My Employee Account"}
      </Button>

      {onSwitchToLogin && (
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-dswd-blue hover:underline font-medium"
          >
            Sign in here
          </button>
        </p>
      )}
    </form>
  );
}
