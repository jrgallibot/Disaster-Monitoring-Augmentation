"use server";

import { getEmployeeSession } from "@/lib/actions/auth";
import {
  createNotifications,
} from "@/lib/actions/notifications";
import {
  chatAttachmentExtensionForMime,
  CHAT_ATTACHMENT_BUCKET,
  fileToArrayBuffer,
  validateChatAttachmentFile,
} from "@/lib/chat-attachment";
import {
  canManageEmployee,
  employeeIsAssignedToLeader,
  employeeIsVisibleTeamMember,
  getEmployeeRecordByUserId,
  getLedRegionIds,
  getTeamLeaderEmployeeIdsForRegions,
} from "@/lib/auth/team-leader";
import { queryEmployeeRows, querySingleEmployeeRow } from "@/lib/supabase/employee-query";
import { isMissingTableError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAutoAssignedTeamLeaderId, getFullName } from "@/lib/utils";
import type {
  ActionResult,
  ChatConversationWithPreview,
  ChatMessage,
  ChatConversationMemberProfile,
  LibraryRegion,
  MessageableEmployee,
} from "@/lib/types";

type EmployeeRow = {
  id: string;
  user_id: string | null;
  employee_id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  region_id: string | null;
  assigned_team_leader_id: string | null;
  region?: LibraryRegion | null;
};

async function getCurrentEmployeeRow(): Promise<
  { ok: true; employee: EmployeeRow; userId: string } | { ok: false }
> {
  const session = await getEmployeeSession();
  if ("error" in session) return { ok: false };

  const supabase = createServiceClient();
  const employee = await querySingleEmployeeRow(supabase, (select) =>
    supabase.from("employees").select(select).eq("user_id", session.user.id).maybeSingle()
  );

  if (!employee || !employee.user_id) return { ok: false };
  return { ok: true, employee: employee as EmployeeRow, userId: session.user.id };
}

function normalizeMessageRow(message: ChatMessage): ChatMessage {
  return {
    ...message,
    edited_at: message.edited_at ?? null,
    deleted_at: message.deleted_at ?? null,
    deleted_by_user_id: message.deleted_by_user_id ?? null,
    attachment_url: message.attachment_url ?? null,
    attachment_name: message.attachment_name ?? null,
    attachment_mime: message.attachment_mime ?? null,
  };
}

async function getAuthClient() {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return null;
  return { authClient, user };
}

export async function canMessageEmployee(
  authUserId: string,
  targetEmployeeId: string
): Promise<boolean> {
  if (!authUserId || !targetEmployeeId) return false;

  const myRecord = await getEmployeeRecordByUserId(authUserId);
  if (!myRecord) return false;
  if (myRecord.id === targetEmployeeId) return false;

  const access = await canManageEmployee(authUserId, targetEmployeeId);
  if (access.allowed) return true;

  const supabase = createServiceClient();
  const { data: target, error } = await supabase
    .from("employees")
    .select("id, region_id, assigned_team_leader_id, user_id")
    .eq("id", targetEmployeeId)
    .maybeSingle();

  if (error || !target) return false;

  const { data: me, error: meError } = await supabase
    .from("employees")
    .select("id, region_id, assigned_team_leader_id")
    .eq("user_id", authUserId)
    .maybeSingle();

  if (meError || !me) return false;

  if (target.id === me.assigned_team_leader_id) return true;
  if (me.id === target.assigned_team_leader_id) return true;

  if (
    me.region_id &&
    me.region_id === target.region_id &&
    me.assigned_team_leader_id &&
    me.assigned_team_leader_id === target.assigned_team_leader_id
  ) {
    return true;
  }

  const ledRegionIds = await getLedRegionIds(me.id);
  if (ledRegionIds.length > 0 && target.region_id && ledRegionIds.includes(target.region_id)) {
    const teamLeaderIds = await getTeamLeaderEmployeeIdsForRegions(ledRegionIds);
    return employeeIsVisibleTeamMember(target, me.id, ledRegionIds, teamLeaderIds);
  }

  return false;
}

async function resolveTeamLeaderId(employee: EmployeeRow): Promise<string | null> {
  if (employee.assigned_team_leader_id && employee.assigned_team_leader_id !== employee.id) {
    return employee.assigned_team_leader_id;
  }
  const autoLeaderId = getAutoAssignedTeamLeaderId(employee.region ?? null);
  if (autoLeaderId && autoLeaderId !== employee.id) return autoLeaderId;
  return null;
}

async function getTeamLeaderIdsForRegion(regionId: string): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("library_region_team_leaders")
    .select("employee_id")
    .eq("region_id", regionId);

  if (error) return [];
  return Array.from(new Set((data ?? []).map((row) => row.employee_id)));
}

async function collectTeamMemberEmployeeIds(
  leaderEmployeeId: string,
  regionId: string
): Promise<string[]> {
  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from("employees")
    .select("id, assigned_team_leader_id, region_id")
    .eq("region_id", regionId)
    .not("user_id", "is", null);

  if (error) return [leaderEmployeeId];

  const { data: region } = await supabase
    .from("library_regions")
    .select("id, name, code, team_leaders:library_region_team_leaders(employee_id)")
    .eq("id", regionId)
    .maybeSingle();

  const memberIds = new Set<string>([leaderEmployeeId]);
  for (const row of rows ?? []) {
    if (row.id === leaderEmployeeId) continue;
    if (
      employeeIsAssignedToLeader(
        { ...row, region: region as LibraryRegion | null },
        leaderEmployeeId
      )
    ) {
      memberIds.add(row.id);
    }
  }

  return Array.from(memberIds);
}

async function upsertConversationMembers(
  conversationId: string,
  employeeIds: string[]
): Promise<void> {
  const supabase = createServiceClient();
  const uniqueIds = Array.from(new Set(employeeIds.filter(Boolean)));
  if (uniqueIds.length === 0) return;

  const { data: employees, error } = await supabase
    .from("employees")
    .select("id, user_id")
    .in("id", uniqueIds)
    .not("user_id", "is", null);

  if (error) return;

  const rows = (employees ?? [])
    .filter((e) => e.user_id)
    .map((e) => ({
      conversation_id: conversationId,
      user_id: e.user_id as string,
      employee_id: e.id,
    }));

  if (rows.length === 0) return;

  await supabase
    .from("chat_conversation_members")
    .upsert(rows, { onConflict: "conversation_id,user_id", ignoreDuplicates: true });
}

async function ensureTeamConversationForLeaderAndRegion(
  leaderEmployeeId: string,
  regionId: string,
  createdByUserId: string
): Promise<void> {
  const supabase = createServiceClient();
  const [{ data: region }, { data: leader }] = await Promise.all([
    supabase.from("library_regions").select("name, code").eq("id", regionId).maybeSingle(),
    supabase
      .from("employees")
      .select("id, first_name, last_name, middle_name, employee_id")
      .eq("id", leaderEmployeeId)
      .maybeSingle(),
  ]);

  const memberIds = await collectTeamMemberEmployeeIds(leaderEmployeeId, regionId);
  const leaderName = leader
    ? getFullName(leader.first_name, leader.last_name, leader.middle_name)
    : "Team Leader";
  const regionLabel = region?.name ?? region?.code ?? "Region";
  const conversationName = leader
    ? `${regionLabel} — ${leaderName}`
    : regionLabel;

  const { data: existing } = await supabase
    .from("chat_conversations")
    .select("id, name")
    .eq("type", "team")
    .eq("region_id", regionId)
    .eq("team_leader_employee_id", leaderEmployeeId)
    .maybeSingle();

  let conversationId = existing?.id;

  if (!conversationId) {
    const { data: created, error } = await supabase
      .from("chat_conversations")
      .insert({
        type: "team",
        name: conversationName,
        created_by_user_id: createdByUserId,
        region_id: regionId,
        team_leader_employee_id: leaderEmployeeId,
      })
      .select("id")
      .single();

    if (error) {
      if (isMissingTableError(error)) return;
      throw new Error(error.message);
    }
    conversationId = created.id;
  } else if (existing?.name !== conversationName && conversationId) {
    await supabase
      .from("chat_conversations")
      .update({ name: conversationName })
      .eq("id", conversationId);
  }

  await upsertConversationMembers(conversationId, memberIds);
}

async function ensureRegionTeamChats(regionId: string, createdByUserId: string): Promise<void> {
  const leaderIds = await getTeamLeaderIdsForRegion(regionId);
  await Promise.all(
    leaderIds.map((leaderId) =>
      ensureTeamConversationForLeaderAndRegion(leaderId, regionId, createdByUserId)
    )
  );
}

/** Fast path: only ensure chats this user belongs to (not every leader in region). */
export async function ensureTeamConversation(): Promise<void> {
  const ctx = await getCurrentEmployeeRow();
  if (!ctx.ok) return;

  try {
    const { employee, userId } = ctx;
    const ledRegionIds = await getLedRegionIds(employee.id);

    if (ledRegionIds.length > 0) {
      await Promise.all(
        ledRegionIds.map((regionId) =>
          ensureTeamConversationForLeaderAndRegion(employee.id, regionId, userId)
        )
      );
      return;
    }

    const leaderId = await resolveTeamLeaderId(employee);
    if (!leaderId || !employee.region_id) return;

    await ensureTeamConversationForLeaderAndRegion(
      leaderId,
      employee.region_id,
      userId
    );
  } catch (err) {
    if (err instanceof Error && isMissingTableError({ message: err.message } as { message: string })) {
      return;
    }
    console.error("ensureTeamConversation failed:", err);
  }
}

/** Full region sync — run when opening chat panel (background). */
export async function syncRegionTeamChats(): Promise<void> {
  const ctx = await getCurrentEmployeeRow();
  if (!ctx.ok) return;

  try {
    const regions = new Set<string>();
    const ledRegionIds = await getLedRegionIds(ctx.employee.id);
    ledRegionIds.forEach((id) => regions.add(id));
    if (ctx.employee.region_id) regions.add(ctx.employee.region_id);

    await Promise.all(
      Array.from(regions).map((regionId) =>
        ensureRegionTeamChats(regionId, ctx.userId)
      )
    );
  } catch {
    // Non-blocking background sync
  }
}

async function assertConversationMember(
  userId: string,
  conversationId: string
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("chat_conversation_members")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  return !error && !!data;
}

export async function getMyConversations(): Promise<ChatConversationWithPreview[]> {
  const ctx = await getCurrentEmployeeRow();
  if (!ctx.ok) return [];

  try {
    const supabase = createServiceClient();
    const { data: memberships, error } = await supabase
      .from("chat_conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", ctx.userId);

    if (error) {
      if (isMissingTableError(error)) return [];
      return [];
    }

    const conversationIds = (memberships ?? []).map((m) => m.conversation_id);
    if (conversationIds.length === 0) return [];

    const { data: conversations } = await supabase
      .from("chat_conversations")
      .select("*")
      .in("id", conversationIds);

    const { data: messages } = await supabase
      .from("chat_messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    const { data: memberCounts } = await supabase
      .from("chat_conversation_members")
      .select("conversation_id")
      .in("conversation_id", conversationIds);

    const lastByConversation = new Map<string, ChatMessage>();
    for (const msg of (messages ?? []) as ChatMessage[]) {
      if (msg.deleted_at) continue;
      if (!lastByConversation.has(msg.conversation_id)) {
        lastByConversation.set(msg.conversation_id, msg);
      }
    }

    const countByConversation = new Map<string, number>();
    for (const row of memberCounts ?? []) {
      countByConversation.set(
        row.conversation_id,
        (countByConversation.get(row.conversation_id) ?? 0) + 1
      );
    }

    const membershipMap = new Map(
      (memberships ?? []).map((m) => [m.conversation_id, m.last_read_at as string | null])
    );

    const unreadByConversation = new Map<string, number>();
    for (const msg of (messages ?? []) as ChatMessage[]) {
      if (msg.deleted_at) continue;
      const lastRead = membershipMap.get(msg.conversation_id);
      if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) {
        unreadByConversation.set(
          msg.conversation_id,
          (unreadByConversation.get(msg.conversation_id) ?? 0) + 1
        );
      }
    }

    const previews = ((conversations ?? []) as ChatConversationWithPreview[]).map((conv) => ({
      ...conv,
      last_message: lastByConversation.get(conv.id) ?? null,
      unread_count: unreadByConversation.get(conv.id) ?? 0,
      member_count: countByConversation.get(conv.id) ?? 0,
    }));

    previews.sort((a, b) => {
      if (a.type === "team" && b.type !== "team") return -1;
      if (b.type === "team" && a.type !== "team") return 1;
      const aTime = a.last_message?.created_at ?? a.created_at;
      const bTime = b.last_message?.created_at ?? b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return previews;
  } catch {
    return [];
  }
}

export async function searchMessageableEmployees(
  query: string
): Promise<MessageableEmployee[]> {
  const ctx = await getCurrentEmployeeRow();
  if (!ctx.ok) return [];

  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 2) return [];

  try {
    const supabase = createServiceClient();
    const ledRegionIds = await getLedRegionIds(ctx.employee.id);
    let candidates: EmployeeRow[] = [];

    if (ledRegionIds.length > 0) {
      const teamLeaderIds = await getTeamLeaderEmployeeIdsForRegions(ledRegionIds);
      const rows = await queryEmployeeRows(supabase, (select) =>
        supabase
          .from("employees")
          .select(select)
          .in("region_id", ledRegionIds)
          .not("user_id", "is", null)
      );
      candidates = (rows as EmployeeRow[]).filter((row) =>
        employeeIsVisibleTeamMember(row, ctx.employee.id, ledRegionIds, teamLeaderIds)
      );
    } else {
      const leaderId = await resolveTeamLeaderId(ctx.employee);
      if (!leaderId || !ctx.employee.region_id) return [];

      const { data: rows } = await supabase
        .from("employees")
        .select("id, user_id, employee_id, first_name, last_name, middle_name, region_id, assigned_team_leader_id")
        .eq("region_id", ctx.employee.region_id)
        .not("user_id", "is", null);

      const memberIds = await collectTeamMemberEmployeeIds(leaderId, ctx.employee.region_id);
      const memberSet = new Set(memberIds);
      candidates = ((rows ?? []) as EmployeeRow[]).filter((row) => memberSet.has(row.id));
    }

    return candidates
      .filter((row) => row.id !== ctx.employee.id)
      .filter((row) => {
        const fullName = getFullName(
          row.first_name,
          row.last_name,
          row.middle_name
        ).toLowerCase();
        return (
          fullName.includes(trimmed) ||
          row.employee_id.toLowerCase().includes(trimmed)
        );
      })
      .slice(0, 20)
      .map((row) => ({
        id: row.id,
        employee_id: row.employee_id,
        first_name: row.first_name,
        last_name: row.last_name,
        middle_name: row.middle_name,
        user_id: row.user_id,
      }));
  } catch {
    return [];
  }
}

export async function getOrCreateDirectConversation(
  targetEmployeeId: string
): Promise<ActionResult & { conversationId?: string }> {
  const ctx = await getCurrentEmployeeRow();
  if (!ctx.ok) return { success: false, error: "You must be logged in." };

  const allowed = await canMessageEmployee(ctx.userId, targetEmployeeId);
  if (!allowed) {
    return { success: false, error: "You cannot message this employee." };
  }

  try {
    const supabase = createServiceClient();
    const { data: target, error: targetError } = await supabase
      .from("employees")
      .select("id, user_id, first_name, last_name, middle_name")
      .eq("id", targetEmployeeId)
      .maybeSingle();

    if (targetError || !target?.user_id) {
      return { success: false, error: "Employee not found or has no portal account." };
    }

    const { data: myMemberships } = await supabase
      .from("chat_conversation_members")
      .select("conversation_id")
      .eq("user_id", ctx.userId);

    const myConversationIds = (myMemberships ?? []).map((m) => m.conversation_id);
    if (myConversationIds.length > 0) {
      const { data: directConversations } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("type", "direct")
        .in("id", myConversationIds);

      for (const conv of directConversations ?? []) {
        const { data: members } = await supabase
          .from("chat_conversation_members")
          .select("employee_id")
          .eq("conversation_id", conv.id);

        const memberIds = new Set((members ?? []).map((m) => m.employee_id));
        if (
          memberIds.size === 2 &&
          memberIds.has(ctx.employee.id) &&
          memberIds.has(targetEmployeeId)
        ) {
          return { success: true, conversationId: conv.id };
        }
      }
    }

    const displayName = getFullName(
      target.first_name,
      target.last_name,
      target.middle_name ?? null
    );
    const { data: created, error } = await supabase
      .from("chat_conversations")
      .insert({
        type: "direct",
        name: displayName,
        created_by_user_id: ctx.userId,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    await upsertConversationMembers(created.id, [ctx.employee.id, targetEmployeeId]);
    return { success: true, conversationId: created.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to start conversation.",
    };
  }
}

export async function createGroupConversation(
  name: string,
  memberEmployeeIds: string[]
): Promise<ActionResult & { conversationId?: string }> {
  const ctx = await getCurrentEmployeeRow();
  if (!ctx.ok) return { success: false, error: "You must be logged in." };

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: "Group name is required." };
  }

  const uniqueMembers = Array.from(
    new Set(memberEmployeeIds.filter((id) => id !== ctx.employee.id))
  );
  if (uniqueMembers.length === 0) {
    return { success: false, error: "Select at least one other member." };
  }

  for (const memberId of uniqueMembers) {
    const allowed = await canMessageEmployee(ctx.userId, memberId);
    if (!allowed) {
      return { success: false, error: "One or more selected members cannot be messaged." };
    }
  }

  try {
    const supabase = createServiceClient();
    const { data: created, error } = await supabase
      .from("chat_conversations")
      .insert({
        type: "group",
        name: trimmedName,
        created_by_user_id: ctx.userId,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    await upsertConversationMembers(created.id, [ctx.employee.id, ...uniqueMembers]);
    return { success: true, conversationId: created.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create group.",
    };
  }
}

export async function getConversationMessages(
  conversationId: string,
  limit = 50
): Promise<ChatMessage[]> {
  const ctx = await getCurrentEmployeeRow();
  if (!ctx.ok) return [];

  const isMember = await assertConversationMember(ctx.userId, conversationId);
  if (!isMember) return [];

  try {
    const supabase = createServiceClient();
    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      if (isMissingTableError(error)) return [];
      return [];
    }

    const senderIds = Array.from(
      new Set((messages ?? []).map((m) => m.sender_employee_id))
    );
    const { data: senders } = await supabase
      .from("employees")
      .select("id, first_name, last_name, employee_id")
      .in("id", senderIds);

    const senderMap = new Map((senders ?? []).map((s) => [s.id, s]));

    return ((messages ?? []) as ChatMessage[]).map((msg) => ({
      ...normalizeMessageRow(msg),
      sender: senderMap.get(msg.sender_employee_id) ?? null,
    }));
  } catch {
    return [];
  }
}

export async function getConversationMembers(
  conversationId: string
): Promise<ChatConversationMemberProfile[]> {
  const ctx = await getCurrentEmployeeRow();
  if (!ctx.ok) return [];

  const isMember = await assertConversationMember(ctx.userId, conversationId);
  if (!isMember) return [];

  try {
    const supabase = createServiceClient();
    const { data: members, error } = await supabase
      .from("chat_conversation_members")
      .select("employee_id")
      .eq("conversation_id", conversationId);

    if (error || !members?.length) return [];

    const employeeIds = members.map((m) => m.employee_id);
    const { data: employees } = await supabase
      .from("employees")
      .select("id, employee_id, first_name, last_name, middle_name, user_id")
      .in("id", employeeIds)
      .order("last_name", { ascending: true });

    return ((employees ?? []) as ChatConversationMemberProfile[]).map((row) => ({
      id: row.id,
      employee_id: row.employee_id,
      first_name: row.first_name,
      last_name: row.last_name,
      middle_name: row.middle_name,
      user_id: row.user_id,
    }));
  } catch {
    return [];
  }
}

async function notifyConversationMembers(
  ctx: { userId: string; employee: EmployeeRow },
  conversationId: string,
  preview: string
): Promise<void> {
  const supabase = createServiceClient();
  const { data: members } = await supabase
    .from("chat_conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", ctx.userId);

  const senderName = getFullName(
    ctx.employee.first_name,
    ctx.employee.last_name,
    ctx.employee.middle_name
  );
  const { data: conversation } = await supabase
    .from("chat_conversations")
    .select("name, type")
    .eq("id", conversationId)
    .maybeSingle();

  const chatTitle =
    conversation?.type === "direct"
      ? `Message from ${senderName}`
      : conversation?.name
        ? `New message in ${conversation.name}`
        : "New chat message";

  await createNotifications(
    (members ?? [])
      .filter((m) => m.user_id)
      .map((m) => ({
        recipientUserId: m.user_id as string,
        type: "chat_message" as const,
        title: chatTitle,
        body: preview.length > 120 ? `${preview.slice(0, 117)}...` : preview,
        link: "/employee/dashboard",
        metadata: {
          conversation_id: conversationId,
          actor_employee_id: ctx.employee.id,
          actor_name: senderName,
        },
        actorName: senderName,
      }))
  );
}

function buildMessageWithSender(
  message: ChatMessage,
  employee: EmployeeRow
): ChatMessage {
  return {
    ...normalizeMessageRow(message),
    sender: {
      first_name: employee.first_name,
      last_name: employee.last_name,
      employee_id: employee.employee_id,
    },
  };
}

async function insertChatMessage(
  ctx: { userId: string; employee: EmployeeRow },
  conversationId: string,
  fields: {
    body: string;
    attachment_url?: string | null;
    attachment_name?: string | null;
    attachment_mime?: string | null;
  }
): Promise<ActionResult & { message?: ChatMessage }> {
  const auth = await getAuthClient();
  if (!auth || auth.user.id !== ctx.userId) {
    return { success: false, error: "You must be logged in." };
  }

  const trimmed = fields.body.trim();
  const hasAttachment = Boolean(fields.attachment_url);
  if (!trimmed && !hasAttachment) {
    return { success: false, error: "Message cannot be empty." };
  }

  const isMember = await assertConversationMember(ctx.userId, conversationId);
  if (!isMember) {
    return { success: false, error: "You are not a member of this conversation." };
  }

  const { data: inserted, error } = await auth.authClient
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      sender_user_id: ctx.userId,
      sender_employee_id: ctx.employee.id,
      body: trimmed,
      attachment_url: fields.attachment_url ?? null,
      attachment_name: fields.attachment_name ?? null,
      attachment_mime: fields.attachment_mime ?? null,
    })
    .select("*")
    .single();

  if (error) return { success: false, error: error.message };

  const preview = hasAttachment
    ? fields.attachment_name
      ? `📎 ${fields.attachment_name}`
      : "📎 Attachment"
    : trimmed;

  await notifyConversationMembers(ctx, conversationId, preview);
  await markConversationRead(conversationId);

  return {
    success: true,
    message: buildMessageWithSender(inserted as ChatMessage, ctx.employee),
  };
}

export async function sendChatMessage(
  conversationId: string,
  body: string
): Promise<ActionResult & { message?: ChatMessage }> {
  const ctx = await getCurrentEmployeeRow();
  if (!ctx.ok) return { success: false, error: "You must be logged in." };

  try {
    return await insertChatMessage(ctx, conversationId, { body });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send message.",
    };
  }
}

export async function sendChatMessageWithAttachment(
  formData: FormData
): Promise<ActionResult & { message?: ChatMessage }> {
  const ctx = await getCurrentEmployeeRow();
  if (!ctx.ok) return { success: false, error: "You must be logged in." };

  const conversationId = String(formData.get("conversationId") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  const file = formData.get("file");

  if (!conversationId) {
    return { success: false, error: "Conversation is required." };
  }

  const validation = validateChatAttachmentFile(file instanceof File ? file : null);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }
  if (!validation.mimeType) {
    return { success: false, error: "Invalid attachment." };
  }

  const uploadFile = file as File;
  const auth = await getAuthClient();
  if (!auth || auth.user.id !== ctx.userId) {
    return { success: false, error: "You must be logged in." };
  }

  const ext = chatAttachmentExtensionForMime(validation.mimeType);
  const objectPath = `${ctx.userId}/${conversationId}/${crypto.randomUUID()}.${ext}`;
  const buffer = await fileToArrayBuffer(uploadFile);

  const { error: uploadError } = await auth.authClient.storage
    .from(CHAT_ATTACHMENT_BUCKET)
    .upload(objectPath, buffer, {
      contentType: validation.mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data: publicUrlData } = auth.authClient.storage
    .from(CHAT_ATTACHMENT_BUCKET)
    .getPublicUrl(objectPath);

  try {
    return await insertChatMessage(ctx, conversationId, {
      body,
      attachment_url: publicUrlData.publicUrl,
      attachment_name: uploadFile.name,
      attachment_mime: validation.mimeType,
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send attachment.",
    };
  }
}

export async function enrichChatMessage(message: ChatMessage): Promise<ChatMessage> {
  if (message.sender) return message;

  const supabase = createServiceClient();
  const { data: sender } = await supabase
    .from("employees")
    .select("id, first_name, last_name, employee_id")
    .eq("id", message.sender_employee_id)
    .maybeSingle();

  return {
    ...normalizeMessageRow(message),
    sender: sender ?? null,
  };
}

export async function editChatMessage(
  messageId: string,
  body: string
): Promise<ActionResult & { message?: ChatMessage }> {
  const ctx = await getCurrentEmployeeRow();
  if (!ctx.ok) return { success: false, error: "You must be logged in." };

  const trimmed = body.trim();
  if (!trimmed) return { success: false, error: "Message cannot be empty." };

  const supabase = createServiceClient();
  const { data: existing, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();

  if (error || !existing) {
    return { success: false, error: "Message not found." };
  }

  if (existing.sender_user_id !== ctx.userId) {
    return { success: false, error: "You can only edit your own messages." };
  }

  if (existing.deleted_at) {
    return { success: false, error: "Deleted messages cannot be edited." };
  }

  const isMember = await assertConversationMember(ctx.userId, existing.conversation_id);
  if (!isMember) {
    return { success: false, error: "You are not a member of this conversation." };
  }

  const auth = await getAuthClient();
  if (!auth || auth.user.id !== ctx.userId) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: updated, error: updateError } = await auth.authClient
    .from("chat_messages")
    .update({
      body: trimmed,
      edited_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .eq("sender_user_id", ctx.userId)
    .select("*")
    .single();

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return {
    success: true,
    message: buildMessageWithSender(updated as ChatMessage, ctx.employee),
  };
}

export async function deleteChatMessage(
  messageId: string
): Promise<ActionResult & { message?: ChatMessage }> {
  const ctx = await getCurrentEmployeeRow();
  if (!ctx.ok) return { success: false, error: "You must be logged in." };

  const supabase = createServiceClient();
  const { data: message, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();

  if (error || !message) {
    return { success: false, error: "Message not found." };
  }

  if (message.sender_user_id !== ctx.userId) {
    return { success: false, error: "You can only delete your own messages." };
  }

  if (message.deleted_at) {
    return { success: true, message: normalizeMessageRow(message as ChatMessage) };
  }

  const isMember = await assertConversationMember(ctx.userId, message.conversation_id);
  if (!isMember) {
    return { success: false, error: "You are not a member of this conversation." };
  }

  const auth = await getAuthClient();
  if (!auth || auth.user.id !== ctx.userId) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: updated, error: updateError } = await auth.authClient
    .from("chat_messages")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by_user_id: ctx.userId,
    })
    .eq("id", messageId)
    .eq("sender_user_id", ctx.userId)
    .select("*")
    .single();

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return {
    success: true,
    message: buildMessageWithSender(updated as ChatMessage, ctx.employee),
  };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const ctx = await getCurrentEmployeeRow();
  if (!ctx.ok) return;

  const auth = await getAuthClient();
  if (!auth) return;

  await auth.authClient
    .from("chat_conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", ctx.userId);
}
