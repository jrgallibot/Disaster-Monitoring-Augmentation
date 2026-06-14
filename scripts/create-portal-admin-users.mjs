/**
 * Creates admin and co-admin (viewer) portal accounts in Supabase Auth + profiles.
 *
 * Usage (from project root):
 *   node scripts/create-portal-admin-users.mjs
 *
 * Optional env overrides:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, COADMIN_EMAIL, COADMIN_PASSWORD
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const accounts = [
  {
    email: process.env.ADMIN_EMAIL ?? "admin@dswd.gov.ph",
    password: process.env.ADMIN_PASSWORD ?? "DswdAdmin@2026",
    role: "admin",
    label: "Administrator (full access)",
  },
  {
    email: process.env.COADMIN_EMAIL ?? "coadmin@dswd.gov.ph",
    password: process.env.COADMIN_PASSWORD ?? "DswdCoAdmin@2026",
    role: "viewer",
    label: "Co-Administrator (view only)",
  },
];

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsertAuthUser({ email, password, role }) {
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  const existing = listData.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  );

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { role },
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role },
  });
  if (error) throw error;
  return data.user;
}

async function upsertProfile(user, role) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      role,
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

async function main() {
  console.log("Creating DSWD admin portal accounts...\n");

  for (const account of accounts) {
    const user = await upsertAuthUser(account);
    if (!user) {
      console.error(`Failed to create ${account.email}`);
      continue;
    }
    await upsertProfile(user, account.role);
    console.log(`✓ ${account.label}`);
    console.log(`  Email:    ${account.email}`);
    console.log(`  Password: ${account.password}`);
    console.log(`  Role:     ${account.role}\n`);
  }

  console.log("Done. Sign in at /admin/login");
  console.log("Change passwords after first login if this is production.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
