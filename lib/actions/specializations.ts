"use server";

import { createServiceClient } from "@/lib/supabase/service";
import type { SpecializationResolveResult } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function findOrCreateSpecialization(
  name: string
): Promise<SpecializationResolveResult> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Specialization name is required." };
  }
  if (trimmed.length < 2) {
    return { success: false, error: "Specialization name must be at least 2 characters." };
  }
  if (trimmed.length > 120) {
    return { success: false, error: "Specialization name must be 120 characters or less." };
  }

  const supabase = createServiceClient();

  const { data: existing, error: lookupError } = await supabase
    .from("library_specializations")
    .select("id, name")
    .ilike("name", trimmed)
    .maybeSingle();

  if (lookupError) return { success: false, error: lookupError.message };
  if (existing) {
    return { success: true, id: existing.id, name: existing.name, created: false };
  }

  const { data: created, error: insertError } = await supabase
    .from("library_specializations")
    .insert({
      name: trimmed,
      description: "Added during employee registration",
      sort_order: 999,
    })
    .select("id, name")
    .single();

  if (insertError) {
    if (insertError.message.toLowerCase().includes("unique")) {
      const { data: retry } = await supabase
        .from("library_specializations")
        .select("id, name")
        .ilike("name", trimmed)
        .maybeSingle();
      if (retry) {
        return { success: true, id: retry.id, name: retry.name, created: false };
      }
    }
    return { success: false, error: insertError.message };
  }

  revalidatePath("/admin/libraries");
  revalidatePath("/employee/login");
  revalidatePath("/employee/register");
  return { success: true, id: created.id, name: created.name, created: true };
}
