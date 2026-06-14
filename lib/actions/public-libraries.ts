"use server";

import { createClient } from "@/lib/supabase/server";
import type { LibraryRegion, LibrarySpecialization } from "@/lib/types";

function hasSupabaseEnv() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Safe library fetch for public auth pages — never throws. */
export async function getPublicSpecializations(): Promise<LibrarySpecialization[]> {
  if (!hasSupabaseEnv()) return [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("library_specializations")
      .select("id, name, description, is_active, sort_order, created_at")
      .eq("is_active", true)
      .order("sort_order");

    if (error) return [];
    return (data ?? []) as LibrarySpecialization[];
  } catch {
    return [];
  }
}

/** Safe region fetch for registration — simple columns, no team leader embeds. */
export async function getPublicRegions(): Promise<LibraryRegion[]> {
  if (!hasSupabaseEnv()) return [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("library_regions")
      .select("id, name, code, is_active, sort_order, created_at")
      .eq("is_active", true)
      .order("sort_order");

    if (error) return [];
    return ((data ?? []) as Omit<LibraryRegion, "team_leaders">[]).map((region) => ({
      ...region,
      team_leaders: [],
    }));
  } catch {
    return [];
  }
}

export async function getPublicLibraryLoadState(): Promise<{
  specializations: LibrarySpecialization[];
  regions: LibraryRegion[];
  configured: boolean;
  librariesAvailable: boolean;
}> {
  const configured = hasSupabaseEnv();
  if (!configured) {
    return {
      specializations: [],
      regions: [],
      configured: false,
      librariesAvailable: false,
    };
  }

  const [specializations, regions] = await Promise.all([
    getPublicSpecializations(),
    getPublicRegions(),
  ]);

  return {
    specializations,
    regions,
    configured: true,
    librariesAvailable: specializations.length > 0 && regions.length > 0,
  };
}
