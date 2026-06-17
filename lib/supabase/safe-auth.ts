import type { AuthError, SupabaseClient, User } from "@supabase/supabase-js";

export function isStaleRefreshTokenError(error: AuthError | null | undefined): boolean {
  if (!error) return false;

  return (
    error.code === "refresh_token_not_found" ||
    error.code === "invalid_refresh_token" ||
    error.message.includes("Refresh Token Not Found") ||
    error.message.includes("Invalid Refresh Token")
  );
}

/** Validate the user JWT and clear broken refresh-token cookies when stale. */
export async function getSupabaseUser(supabase: SupabaseClient): Promise<{
  user: User | null;
  error: AuthError | null;
}> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (isStaleRefreshTokenError(error)) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore sign-out failures; cookies are cleared on the next successful setAll.
    }
    return { user: null, error: null };
  }

  return { user, error };
}
