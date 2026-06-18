"use client";

import { useTransition } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, CheckCheck, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import { useNotificationSubscription } from "@/lib/realtime/use-notification-subscription";
import {
  getNotificationActorName,
  getNotificationTypeColor,
  getNotificationTypeLabel,
} from "@/lib/notification-display";
import { formatRelativeTime } from "@/lib/utils";
import type { EmployeeNotification } from "@/lib/types";

interface EmployeeNotificationBellProps {
  userId: string;
  initialNotifications: EmployeeNotification[];
  initialUnreadCount: number;
}

export function EmployeeNotificationBell({
  userId,
  initialNotifications,
  initialUnreadCount,
}: EmployeeNotificationBellProps) {
  const [isPending, startTransition] = useTransition();
  const {
    notifications,
    setNotifications,
    unreadCount,
    connected,
    markLocalRead,
    markAllLocalRead,
  } = useNotificationSubscription({
    userId,
    initialNotifications,
    initialUnreadCount,
  });

  function handleOpenChange(open: boolean) {
    if (!open) return;
    startTransition(async () => {
      const fresh = await getMyNotifications(30);
      setNotifications(fresh);
    });
  }

  function handleMarkRead(notification: EmployeeNotification) {
    if (notification.read_at) return;
    markLocalRead(notification.id);
    startTransition(async () => {
      await markNotificationRead(notification.id);
    });
  }

  function handleMarkAllRead() {
    markAllLocalRead();
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  }

  return (
    <DropdownMenu.Root onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-10 w-10 rounded-full border-dswd-border bg-white shadow-md ring-1 ring-dswd-navy/10"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell className="h-5 w-5 text-dswd-navy" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-dswd-gold px-1 text-[10px] text-dswd-navy">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-[90] w-[min(100vw-2rem,26rem)] overflow-hidden rounded-xl border border-dswd-border bg-white shadow-2xl"
        >
          <div className="border-b border-dswd-border bg-gradient-to-r from-dswd-navy to-dswd-blue px-4 py-3 text-white">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Field Alerts</p>
                <p className="text-[11px] text-white/80">Disaster monitoring updates</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${
                    connected ? "bg-emerald-500/20 text-emerald-100" : "bg-white/10 text-white/70"
                  }`}
                  title={connected ? "Live updates connected" : "Connecting to live updates..."}
                >
                  <Radio className="h-3 w-3" />
                  {connected ? "Live" : "..."}
                </span>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px] text-white hover:bg-white/10"
                    disabled={isPending}
                    onClick={handleMarkAllRead}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Read all
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                No alerts yet. Team activity will appear here instantly.
              </p>
            ) : (
              notifications.map((notification) => {
                const actorName = getNotificationActorName(notification);
                const typeLabel = getNotificationTypeLabel(notification.type);
                const typeColor = getNotificationTypeColor(notification.type);

                const content = (
                  <div
                    className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      notification.read_at
                        ? "border-transparent opacity-70"
                        : "border-dswd-navy/10 bg-dswd-light/50"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                        style={{ backgroundColor: typeColor }}
                      >
                        {typeLabel}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatRelativeTime(notification.created_at)}
                      </span>
                    </div>
                    {actorName && (
                      <p className="text-xs font-semibold text-dswd-navy">{actorName}</p>
                    )}
                    <p className="mt-0.5 text-sm font-medium text-dswd-navy">
                      {notification.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {notification.body}
                    </p>
                  </div>
                );

                if (notification.link) {
                  return (
                    <DropdownMenu.Item key={notification.id} asChild>
                      <Link
                        href={notification.link}
                        className="mb-1 block cursor-pointer outline-none"
                        onClick={() => handleMarkRead(notification)}
                      >
                        {content}
                      </Link>
                    </DropdownMenu.Item>
                  );
                }

                return (
                  <DropdownMenu.Item
                    key={notification.id}
                    className="mb-1 cursor-pointer outline-none"
                    onSelect={() => handleMarkRead(notification)}
                  >
                    {content}
                  </DropdownMenu.Item>
                );
              })
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
