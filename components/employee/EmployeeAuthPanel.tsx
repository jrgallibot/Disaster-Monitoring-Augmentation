"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeLoginForm } from "@/components/employee/EmployeeLoginForm";
import { EmployeeRegisterForm } from "@/components/employee/EmployeeRegisterForm";
import { UserCircle, UserPlus, Info } from "lucide-react";
import type { LibraryRegion, LibrarySpecialization } from "@/lib/types";

interface EmployeeAuthPanelProps {
  defaultTab?: "login" | "register";
  specializations: LibrarySpecialization[];
  regions: LibraryRegion[];
}

export function EmployeeAuthPanel({
  defaultTab = "login",
  specializations,
  regions,
}: EmployeeAuthPanelProps) {
  const [tab, setTab] = useState(defaultTab);

  return (
    <div className="w-full max-w-lg">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="login" className="gap-2">
            <UserCircle className="h-4 w-4" />
            Sign In
          </TabsTrigger>
          <TabsTrigger value="register" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Create Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-dswd-navy">
            <p className="font-medium mb-1">Already registered?</p>
            <p className="text-muted-foreground">
              Sign in to update your profile, deployment status, and contact details.
            </p>
          </div>
          <EmployeeLoginForm onSwitchToRegister={() => setTab("register")} />
        </TabsContent>

        <TabsContent value="register">
          <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-lg text-sm">
            <div className="flex gap-2 items-start">
              <Info className="h-4 w-4 text-dswd-gold shrink-0 mt-0.5" />
              <div className="text-dswd-navy">
                <p className="font-medium mb-2">To create your account, provide:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Your <strong className="text-foreground">DSWD Employee ID</strong></li>
                  <li>Your <strong className="text-foreground">email address</strong> for sign-in</li>
                  <li>Your <strong className="text-foreground">specialization</strong> and <strong className="text-foreground">home region</strong></li>
                  <li>A password (minimum 6 characters)</li>
                </ul>
              </div>
            </div>
          </div>
          <EmployeeRegisterForm
            specializations={specializations}
            regions={regions}
            onSwitchToLogin={() => setTab("login")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
