"use client";

import { createClient } from "@/lib/supabase/client";
import { prepareRealtimeClient } from "@/lib/realtime/realtime-auth";
import type { ChatMessage } from "@/lib/types";

export async function broadcastChatMessage(
  conversationId: string,
  message: ChatMessage
): Promise<void> {
  const supabase = await prepareRealtimeClient(createClient());
  if (!supabase) return;

  const channel = supabase.channel(`chat-room:${conversationId}`, {
    config: { broadcast: { ack: false, self: false } },
  });

  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel
          .send({
            type: "broadcast",
            event: "message",
            payload: message,
          })
          .finally(() => {
            void supabase.removeChannel(channel);
            resolve();
          });
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        void supabase.removeChannel(channel);
        resolve();
      }
    });
  });
}

export async function broadcastChatMessageUpdate(
  conversationId: string,
  message: ChatMessage
): Promise<void> {
  const supabase = await prepareRealtimeClient(createClient());
  if (!supabase) return;

  const channel = supabase.channel(`chat-room:${conversationId}`, {
    config: { broadcast: { ack: false, self: false } },
  });

  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel
          .send({
            type: "broadcast",
            event: "message_updated",
            payload: message,
          })
          .finally(() => {
            void supabase.removeChannel(channel);
            resolve();
          });
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        void supabase.removeChannel(channel);
        resolve();
      }
    });
  });
}
