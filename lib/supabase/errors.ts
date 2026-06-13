/** True when PostgREST/Postgres reports the relation is missing (not RLS or validation). */
export function isMissingTableError(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "PGRST205" || code === "42P01") return true;

  return (
    message.includes("could not find the table") ||
    message.includes("relation") && message.includes("does not exist") ||
    message.includes("schema cache")
  );
}
