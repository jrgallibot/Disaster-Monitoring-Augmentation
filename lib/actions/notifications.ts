"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getEmployeeSession } from "@/lib/actions/auth";
import { isMissingTableError } from "@/lib/supabase/errors";
import type { EmployeeNotification, EmployeeNotificationType } from "@/lib/types";

export type CreateNotificationInput = {
  recipientUserId: string;
  type: EmployeeNotificationType;
  title: string;
  body: string;
  link?: string | null;
  metadata?: Record<string, unknown>;
  actorName?: string | null;
};

export async function createNotification(
  input: CreateNotificationInput
): Promise<{ ok: true; id: string } | { ok: false }> {
  if (!input.recipientUserId) return { ok: false };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("employee_notifications")
      .insert({
        recipient_user_id: input.recipientUserId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
        metadata: {
          ...(input.metadata ?? {}),
          ...(input.actorName ? { actor_name: input.actorName } : {}),
        },
      })
      .select("id")
      .single();

    if (error) {
      if (isMissingTableError(error)) return { ok: false };
      console.error("createNotification failed:", error.message);
      return { ok: false };
    }

    return { ok: true, id: data.id };
  } catch {
    return { ok: false };
  }
}

export async function createNotifications(
  inputs: CreateNotificationInput[]
): Promise<void> {
  const unique = new Map<string, CreateNotificationInput>();
  for (const input of inputs) {
    if (!input.recipientUserId) continue;
    const key = `${input.recipientUserId}:${input.type}:${input.title}:${input.body}`;
    unique.set(key, input);
  }
  await Promise.all(Array.from(unique.values()).map((input) => createNotification(input)));
}

export async function getMyNotifications(
  limit = 30,
  unreadOnly = false
): Promise<EmployeeNotification[]> {
  const session = await getEmployeeSession();
  if ("error" in session) return [];

  try {
    const supabase = createServiceClient();
    let query = supabase
      .from("employee_notifications")
      .select("*")
      .eq("recipient_user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.is("read_at", null);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error)) return [];
      throw new Error(error.message);
    }

    return (data ?? []) as EmployeeNotification[];
  } catch {
    return [];
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  const session = await getEmployeeSession();
  if ("error" in session) return 0;

  try {
    const supabase = createServiceClient();
    const { count, error } = await supabase
      .from("employee_notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_user_id", session.user.id)
      .is("read_at", null);

    if (error) {
      if (isMissingTableError(error)) return 0;
      return 0;
    }

    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function markNotificationRead(
  notificationId: string
): Promise<{ success: boolean }> {
  const session = await getEmployeeSession();
  if ("error" in session) return { success: false };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("employee_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_user_id", session.user.id);

  return { success: !error };
}

export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  const session = await getEmployeeSession();
  if ("error" in session) return { success: false };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("employee_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_user_id", session.user.id)
    .is("read_at", null);

  return { success: !error };
}

export async function notifyTeamLeaderOfEmployeeAction(
  employeeId: string,
  type: Exclude<EmployeeNotificationType, "chat_message">,
  title: string,
  body: string,
  link?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { data: employee, error } = await supabase
      .from("employees")
      .select("id, assigned_team_leader_id, first_name, last_name, middle_name")
      .eq("id", employeeId)
      .maybeSingle();

    if (error || !employee?.assigned_team_leader_id) return;

    const actorName = `${employee.last_name}, ${employee.first_name}${
      employee.middle_name ? ` ${employee.middle_name}` : ""
    }`;

    const { data: leader, error: leaderError } = await supabase
      .from("employees")
      .select("user_id")
      .eq("id", employee.assigned_team_leader_id)
      .maybeSingle();

    if (leaderError || !leader?.user_id) return;

    await createNotification({
      recipientUserId: leader.user_id,
      type,
      title,
      body,
      link: link ?? "/employee/team",
      actorName,
      metadata: {
        actor_employee_id: employeeId,
        ...metadata,
      },
    });
  } catch {
    // Non-blocking
  }
}

export async function notifyEmployeeUser(
  userId: string | null | undefined,
  type: EmployeeNotificationType,
  title: string,
  body: string,
  link?: string,
  metadata?: Record<string, unknown>,
  actorName?: string | null
): Promise<void> {
  if (!userId) return;
  await createNotification({
    recipientUserId: userId,
    type,
    title,
    body,
    link: link ?? "/employee/dashboard",
    metadata: metadata ?? {},
    actorName,
  });
}
