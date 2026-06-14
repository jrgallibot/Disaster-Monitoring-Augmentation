import { EmployeeChangePasswordForm } from "@/components/employee/EmployeeChangePasswordForm";

export const dynamic = "force-dynamic";

export default function EmployeeChangePasswordPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="gov-section-title">Change Password</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Update your Employee Portal sign-in password. This is separate from your profile and
          deployment settings on My Account.
        </p>
      </div>
      <EmployeeChangePasswordForm />
    </div>
  );
}
