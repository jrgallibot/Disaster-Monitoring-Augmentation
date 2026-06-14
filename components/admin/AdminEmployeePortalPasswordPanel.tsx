"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getEmployeePortalPasswordStatus,
  revealEmployeePortalPassword,
  setEmployeePortalPassword,
} from "@/lib/actions/employee-password";
import { toast } from "@/lib/toast";
import type { EmployeeWithRelations } from "@/lib/types";
import { Copy, Eye, KeyRound } from "lucide-react";

interface AdminEmployeePortalPasswordPanelProps {
  employee: EmployeeWithRelations;
  canManage: boolean;
}

export function AdminEmployeePortalPasswordPanel({
  employee,
  canManage,
}: AdminEmployeePortalPasswordPanelProps) {
  const [status, setStatus] = useState<{ hasPortalAccount: boolean; hasVaultRecord: boolean } | null>(
    null
  );
  const [newPassword, setNewPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasPortalAccount = Boolean(employee.user_id);

  useEffect(() => {
    if (!hasPortalAccount) {
      setStatus({ hasPortalAccount: false, hasVaultRecord: false });
      return;
    }

    void getEmployeePortalPasswordStatus(employee.id).then(setStatus);
  }, [employee.id, hasPortalAccount]);

  function handleCopy(password: string) {
    void navigator.clipboard.writeText(password);
    toast.success("Password copied to clipboard.");
  }

  function handleSetPassword() {
    if (!newPassword.trim()) {
      const message = "Enter a password for this employee.";
      setError(message);
      toast.error(message);
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await setEmployeePortalPassword(employee.id, newPassword);

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setSavedPassword(result.password ?? newPassword);
      setNewPassword("");
      setStatus({ hasPortalAccount: true, hasVaultRecord: true });
      toast.success("Portal password saved.");
    });
  }

  function handleViewPassword() {
    if (!adminPassword.trim()) {
      const message = "Enter your admin password to view the stored password.";
      setError(message);
      toast.error(message);
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await revealEmployeePortalPassword(employee.id, adminPassword);

      if (!result.success) {
        if (result.error === "NEEDS_VAULT_SYNC") {
          setError("No password on file yet. Set a password below.");
          return;
        }
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setRevealedPassword(result.password ?? null);
      setAdminPassword("");
      toast.success("Password revealed.");
    });
  }

  if (!hasPortalAccount) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        This employee has no linked portal account yet.
      </div>
    );
  }

  const displayPassword = savedPassword ?? revealedPassword;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dswd-border bg-dswd-light p-4 space-y-2">
        <p className="text-xs font-semibold text-dswd-navy uppercase tracking-wide">
          Portal Account
        </p>
        <p className="text-sm text-muted-foreground">
          Email: <span className="font-medium text-foreground">{employee.email ?? "—"}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Password on file:{" "}
          <span className="font-medium text-foreground">
            {status?.hasVaultRecord ? "Yes" : "No — set one below"}
          </span>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {displayPassword && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
          <p className="text-sm font-medium text-green-900">Portal password</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono bg-white border border-green-200 rounded px-3 py-2 break-all">
              {displayPassword}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={() => handleCopy(displayPassword)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {canManage && (
        <>
          {!displayPassword && status?.hasVaultRecord && (
            <div className="space-y-2">
              <Label htmlFor={`history-admin-pw-${employee.id}`}>Your Admin Password</Label>
              <Input
                id={`history-admin-pw-${employee.id}`}
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
              <Button onClick={handleViewPassword} disabled={isPending} size="sm">
                <Eye className="h-4 w-4" />
                {isPending ? "Verifying..." : "View Stored Password"}
              </Button>
            </div>
          )}

          {(!status?.hasVaultRecord || !displayPassword) && (
            <div className="space-y-2 border-t border-dswd-border pt-4">
              <p className="text-sm font-medium text-dswd-navy">
                {status?.hasVaultRecord ? "Set New Password" : "Create Portal Password"}
              </p>
              <p className="text-xs text-muted-foreground">
                Set any password (minimum 4 characters). This updates the employee login and saves
                it for viewing.
              </p>
              <Label htmlFor={`history-new-pw-${employee.id}`}>New Password</Label>
              <Input
                id={`history-new-pw-${employee.id}`}
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                placeholder="e.g. DSWD2026"
              />
              <Button onClick={handleSetPassword} disabled={isPending} size="sm">
                <KeyRound className="h-4 w-4" />
                {isPending ? "Saving..." : "Save Password"}
              </Button>
            </div>
          )}
        </>
      )}

      {!canManage && !status?.hasVaultRecord && (
        <p className="text-sm text-muted-foreground">
          No stored portal password. Ask a full administrator to set one.
        </p>
      )}
    </div>
  );
}
