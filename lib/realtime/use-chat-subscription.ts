"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { prepareRealtimeClient } from "@/lib/realtime/realtime-auth";
import { enrichChatMessage } from "@/lib/actions/chat";
import type { ChatMessage } from "@/lib/types";

type UseChatSubscriptionOptions = {
  userId: string | null;
  enabled: boolean;
  memberConversationIds: string[];
  activeConversationId: string | null;
  onMessage: (message: ChatMessage) => void;
  onMessageUpdated: (message: ChatMessage) => void;
  onConversationActivity?: (conversationId: string) => void;
};

function normalizeMessage(raw: ChatMessage): ChatMessage {
  return {
    ...raw,
    deleted_at: raw.deleted_at ?? null,
    deleted_by_user_id: raw.deleted_by_user_id ?? null,
    edited_at: raw.edited_at ?? null,
    attachment_url: raw.attachment_url ?? null,
    attachment_name: raw.attachment_name ?? null,
    attachment_mime: raw.attachment_mime ?? null,
  };
}

export function useChatSubscription({
  userId,
  enabled,
  memberConversationIds,
  activeConversationId,
  onMessage,
  onMessageUpdated,
  onConversationActivity,
}: UseChatSubscriptionOptions) {
  const onMessageRef = useRef(onMessage);
  const onMessageUpdatedRef = useRef(onMessageUpdated);
  const onActivityRef = useRef(onConversationActivity);
  const conversationSetRef = useRef(new Set<string>());
  const activeConversationRef = useRef<string | null>(null);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onMessageUpdatedRef.current = onMessageUpdated;
  }, [onMessageUpdated]);

  useEffect(() => {
    onActivityRef.current = onConversationActivity;
  }, [onConversationActivity]);

  useEffect(() => {
    conversationSetRef.current = new Set(memberConversationIds);
  }, [memberConversationIds]);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (!userId || !enabled) return;

    let active = true;
    const supabase = createClient();
    const roomChannels: ReturnType<typeof supabase.channel>[] = [];
    let postgresChannel: ReturnType<typeof supabase.channel> | null = null;

    const handlePayload = async (
      raw: ChatMessage,
      mode: "insert" | "update"
    ) => {
      if (!conversationSetRef.current.has(raw.conversation_id)) return;

      onActivityRef.current?.(raw.conversation_id);

      const enriched = await enrichChatMessage(normalizeMessage(raw));
      if (!active) return;

      if (activeConversationRef.current !== enriched.conversation_id) return;

      if (mode === "insert") {
        onMessageRef.current(enriched);
      } else {
        onMessageUpdatedRef.current(enriched);
      }
    };

    void (async () => {
      const client = await prepareRealtimeClient(supabase);
      if (!client || !active) return;

      postgresChannel = client
        .channel(`employee-chat-db:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_messages" },
          (payload) => {
            void handlePayload(payload.new as ChatMessage, "insert");
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "chat_messages" },
          (payload) => {
            void handlePayload(payload.new as ChatMessage, "update");
          }
        )
        .subscribe();

      for (const conversationId of memberConversationIds) {
        const roomChannel = client
          .channel(`chat-room:${conversationId}`, {
            config: { broadcast: { ack: false, self: true } },
          })
          .on("broadcast", { event: "message" }, ({ payload }) => {
            void handlePayload(payload as ChatMessage, "insert");
          })
          .on("broadcast", { event: "message_updated" }, ({ payload }) => {
            void handlePayload(payload as ChatMessage, "update");
          })
          .subscribe();

        roomChannels.push(roomChannel);
      }
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
      if (postgresChannel) void supabase.removeChannel(postgresChannel);
      for (const channel of roomChannels) {
        void supabase.removeChannel(channel);
      }
    };
  }, [userId, enabled, memberConversationIds.join("|")]);
}
