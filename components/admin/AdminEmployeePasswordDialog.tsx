"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAdminAccountEmail,
  resetEmployeePortalPassword,
  revealEmployeePortalPassword,
  setEmployeePortalPassword,
  syncEmployeePortalPasswordToVault,
} from "@/lib/actions/employee-password";
import { toast } from "@/lib/toast";
import { getFullName } from "@/lib/utils";
import type { EmployeeWithRelations } from "@/lib/types";
import { Copy, Eye, KeyRound, RefreshCw, X } from "lucide-react";

type DialogMode = "view" | "reset";

interface AdminEmployeePasswordDialogProps {
  employee: EmployeeWithRelations | null;
  mode: DialogMode | null;
  onClose: () => void;
}

export function AdminEmployeePasswordDialog({
  employee,
  mode,
  onClose,
}: AdminEmployeePasswordDialogProps) {
  const [adminPassword, setAdminPassword] = useState("");
  const [employeePassword, setEmployeePassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [adminPasswordReadOnly, setAdminPasswordReadOnly] = useState(true);
  const [employeePasswordReadOnly, setEmployeePasswordReadOnly] = useState(true);
  const [needsVaultSync, setNeedsVaultSync] = useState(false);
  const [adminAccountEmail, setAdminAccountEmail] = useState<string | null>(null);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!employee || !mode) return;
    setAdminPassword("");
    setEmployeePassword("");
    setNewPassword("");
    setAdminPasswordReadOnly(true);
    setEmployeePasswordReadOnly(true);
    setNeedsVaultSync(false);
    setAdminAccountEmail(null);
    setRevealedPassword(null);
    setResetPassword(null);
    setError(null);

    if (mode === "view") {
      void getAdminAccountEmail().then((result) => {
        if (result.success) {
          setAdminAccountEmail(result.email);
        }
      });
    }
  }, [employee, mode]);

  if (!employee || !mode) return null;

  const hasPortalAccount = Boolean(employee.user_id);
  const employeeName = getFullName(
    employee.first_name,
    employee.last_name,
    employee.middle_name
  );

  function handleCopy(password: string) {
    void navigator.clipboard.writeText(password);
    toast.success("Password copied to clipboard.");
  }

  function handleReveal() {
    if (!adminPassword.trim()) {
      const message = "Enter your admin password to view this employee's password.";
      setError(message);
      toast.error(message);
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await revealEmployeePortalPassword(employee!.id, adminPassword);

      if (!result.success) {
        if (result.error === "NEEDS_VAULT_SYNC") {
          setNeedsVaultSync(true);
          setError(null);
          return;
        }
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setRevealedPassword(result.password ?? null);
      setAdminPassword("");
      setNeedsVaultSync(false);
      toast.success("Password revealed.");
    });
  }

  function handleSetNewPassword() {
    if (!newPassword.trim()) {
      const message = "Enter a new password for this employee.";
      setError(message);
      toast.error(message);
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await setEmployeePortalPassword(employee!.id, newPassword);

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setRevealedPassword(result.password ?? newPassword);
      setNewPassword("");
      setNeedsVaultSync(false);
      toast.success("Password created and saved.");
    });
  }

  function handleSyncToVault() {
    if (!adminPassword.trim()) {
      const message = "Enter your admin password first.";
      setError(message);
      toast.error(message);
      return;
    }
    if (!employeePassword.trim()) {
      const message = "Enter the employee's current portal password.";
      setError(message);
      toast.error(message);
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await syncEmployeePortalPasswordToVault(
        employee!.id,
        employeePassword,
        adminPassword
      );

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setRevealedPassword(result.password ?? null);
      setAdminPassword("");
      setEmployeePassword("");
      setNeedsVaultSync(false);
      toast.success("Password verified and saved. You can view it anytime.");
    });
  }

  function handleReset() {
    startTransition(async () => {
      setError(null);
      const result = await resetEmployeePortalPassword(employee!.id);

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setResetPassword(result.password ?? null);
      toast.success("Password reset successfully.");
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-dswd-border">
          <div>
            <h2 className="text-lg font-bold text-dswd-navy flex items-center gap-2">
              {mode === "view" ? (
                <>
                  <Eye className="h-5 w-5" />
                  View Portal Password
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5" />
                  Reset Portal Password
                </>
              )}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{employeeName}</p>
            <p className="text-xs font-mono text-muted-foreground">{employee.employee_id}</p>
            {employee.email && (
              <p className="text-xs text-muted-foreground mt-1">{employee.email}</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4">
          {!hasPortalAccount ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This employee has no linked portal account yet.
            </div>
          ) : mode === "view" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Enter the password for your currently signed-in admin account
                {adminAccountEmail ? (
                  <>
                    {" "}
                    (<span className="font-medium text-foreground">{adminAccountEmail}</span>)
                  </>
                ) : (
                  "..."
                )}
                . This is not the employee&apos;s password.
              </p>

              {adminAccountEmail &&
                adminAccountEmail !== "admin@dswd.gov.ph" && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                    You are signed in as <strong>{adminAccountEmail}</strong>. Use that account&apos;s
                    password, not the default <strong>admin@dswd.gov.ph</strong> password unless you
                    signed in with that account.
                  </div>
                )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {!revealedPassword ? (
                <div className="space-y-4">
                  {needsVaultSync && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-2">
                      <p className="font-medium">Password not saved in vault yet</p>
                      <p>
                        This account was created before password storage was enabled. Enter the
                        employee&apos;s current portal password below to verify it and save it for
                        future viewing.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor={`admin-reauth-${employee.id}`}>Your Admin Password *</Label>
                    <Input
                      id={`admin-reauth-${employee.id}`}
                      name="admin-reauth-field"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      onFocus={() => setAdminPasswordReadOnly(false)}
                      readOnly={adminPasswordReadOnly}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      data-1p-ignore
                      data-lpignore="true"
                      data-form-type="other"
                      placeholder=""
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter manually. Saved passwords are not used for this step.
                    </p>
                  </div>

                  {needsVaultSync && (
                    <div className="space-y-4 border-t border-dswd-border pt-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-dswd-navy">Create a new password</p>
                        <p className="text-xs text-muted-foreground">
                          Set any password (minimum 4 characters). No need to know the old one.
                        </p>
                        <Label htmlFor={`new-portal-pw-${employee.id}`}>New Password</Label>
                        <Input
                          id={`new-portal-pw-${employee.id}`}
                          type="text"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                          placeholder="e.g. DSWD2026"
                        />
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={handleSetNewPassword}
                          disabled={isPending}
                        >
                          <KeyRound className="h-4 w-4" />
                          {isPending ? "Saving..." : "Create Password"}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-dswd-navy">
                          Or save existing password
                        </p>
                        <Label htmlFor={`employee-portal-${employee.id}`}>
                          Employee&apos;s Current Portal Password
                        </Label>
                        <Input
                          id={`employee-portal-${employee.id}`}
                          name="employee-portal-field"
                          type="password"
                          value={employeePassword}
                          onChange={(e) => setEmployeePassword(e.target.value)}
                          onFocus={() => setEmployeePasswordReadOnly(false)}
                          readOnly={employeePasswordReadOnly}
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                          data-form-type="other"
                          placeholder=""
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dswd-border bg-dswd-light p-4 space-y-3">
                  <p className="text-xs font-semibold text-dswd-navy uppercase tracking-wide">
                    Portal Password
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono bg-white border border-dswd-border rounded px-3 py-2 break-all">
                      {revealedPassword}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(revealedPassword)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Generate a new portal password for this employee. The previous password will stop
                working immediately.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {resetPassword ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
                  <p className="text-sm font-medium text-green-900">
                    New password generated. Share it securely with the employee.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono bg-white border border-green-200 rounded px-3 py-2 break-all">
                      {resetPassword}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(resetPassword)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  This action cannot be undone. The employee must use the new password to sign in.
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-5 border-t border-dswd-border flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Close
          </Button>
          {hasPortalAccount && mode === "view" && !revealedPassword && (
            <>
              {needsVaultSync ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSyncToVault}
                  disabled={isPending}
                >
                  <KeyRound className="h-4 w-4" />
                  {isPending ? "Verifying..." : "Save Existing Password"}
                </Button>
              ) : (
                <Button onClick={handleReveal} disabled={isPending}>
                  <KeyRound className="h-4 w-4" />
                  {isPending ? "Verifying..." : "View Password"}
                </Button>
              )}
            </>
          )}
          {hasPortalAccount && mode === "reset" && !resetPassword && (
            <Button onClick={handleReset} disabled={isPending}>
              <RefreshCw className="h-4 w-4" />
              {isPending ? "Resetting..." : "Reset Password"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
