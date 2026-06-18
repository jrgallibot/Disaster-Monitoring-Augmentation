"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { prepareRealtimeClient } from "@/lib/realtime/realtime-auth";
import type { EmployeeNotification } from "@/lib/types";
import { toast } from "@/lib/toast";
import { getNotificationActorName } from "@/lib/notification-display";

type UseNotificationSubscriptionOptions = {
  userId: string | null;
  initialNotifications?: EmployeeNotification[];
  initialUnreadCount?: number;
};

export function useNotificationSubscription({
  userId,
  initialNotifications = [],
  initialUnreadCount = 0,
}: UseNotificationSubscriptionOptions) {
  const [notifications, setNotifications] =
    useState<EmployeeNotification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [connected, setConnected] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    const supabase = createClient();

    void (async () => {
      const client = await prepareRealtimeClient(supabase);
      if (!client || !active) return;

      channel = client
        .channel(`employee-notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "employee_notifications",
            filter: `recipient_user_id=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as EmployeeNotification;
            setNotifications((prev) => {
              if (prev.some((item) => item.id === row.id)) return prev;
              return [row, ...prev].slice(0, 50);
            });
            setUnreadCount((count) => count + 1);

            const sender = getNotificationActorName(row);
            const prefix = sender ? `${sender}: ` : "";
            if (row.type !== "chat_message") {
              toast.info(`${prefix}${row.title}`);
            } else {
              toast.info(`${prefix}${row.body}`);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "employee_notifications",
            filter: `recipient_user_id=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as EmployeeNotification;
            setNotifications((prev) =>
              prev.map((item) => (item.id === row.id ? row : item))
            );
            if (row.read_at) {
              setUnreadCount((count) => Math.max(0, count - 1));
            }
          }
        )
        .subscribe((status) => {
          if (!active) return;
          setConnected(status === "SUBSCRIBED");
        });
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId]);

  const markLocalRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notificationId && !item.read_at
          ? { ...item, read_at: new Date().toISOString() }
          : item
      )
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const markAllLocalRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        read_at: item.read_at ?? new Date().toISOString(),
      }))
    );
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    setNotifications,
    unreadCount,
    setUnreadCount,
    connected,
    markLocalRead,
    markAllLocalRead,
  };
}
