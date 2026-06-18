"use client";

import { useEffect, useRef } from "react";
import { EmployeeNotificationBell } from "@/components/employee/EmployeeNotificationBell";
import { EmployeeChatFab } from "@/components/employee/EmployeeChatFab";
import { ensureTeamConversation } from "@/lib/actions/chat";
import type { EmployeeNotification } from "@/lib/types";

interface EmployeePanelChromeProps {
  userId: string;
  myEmployeeId: string;
  initialNotifications: EmployeeNotification[];
  initialUnreadCount: number;
}

export function EmployeePanelChrome({
  userId,
  myEmployeeId,
  initialNotifications,
  initialUnreadCount,
}: EmployeePanelChromeProps) {
  const syncedRef = useRef(false);

  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;
    void ensureTeamConversation();
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed right-4 top-[4.75rem] z-[90] sm:right-6 lg:top-6">
        <div className="pointer-events-auto">
          <EmployeeNotificationBell
            userId={userId}
            initialNotifications={initialNotifications}
            initialUnreadCount={initialUnreadCount}
          />
        </div>
      </div>
      <EmployeeChatFab userId={userId} myEmployeeId={myEmployeeId} />
    </>
  );
}
