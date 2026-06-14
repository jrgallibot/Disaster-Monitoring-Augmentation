"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { employeeLogin } from "@/lib/actions/auth";
import { toast } from "@/lib/toast";

interface EmployeeLoginFormProps {
  onSwitchToRegister?: () => void;
}

export function EmployeeLoginForm({ onSwitchToRegister }: EmployeeLoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await employeeLogin(formData);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
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
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="your.email@dswd.gov.ph"
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign In to My Account"}
      </Button>
      {onSwitchToRegister && (
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account yet?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-dswd-blue hover:underline font-medium"
          >
            Create your account here
          </button>
        </p>
      )}
    </form>
  );
}
