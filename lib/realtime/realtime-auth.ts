"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export async function prepareRealtimeClient(
  supabase: SupabaseClient = createClient()
): Promise<SupabaseClient | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return null;

  await supabase.realtime.setAuth(session.access_token);
  return supabase;
}
