/**
 * Backdate accomplishments for a team leader and their team members to a specific date.
 *
 * Usage:
 *   node scripts/backdate-team-accomplishments.mjs --dry-run
 *   node scripts/backdate-team-accomplishments.mjs --apply
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const LEADER_EMPLOYEE_ID = "16-09388";
const REGION_CODE = "Region XIII";
const TARGET_DATE = "2026-07-14";
const TARGET_ISO = `${TARGET_DATE}T14:30:00+08:00`;

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
const apply = process.argv.includes("--apply");
const dryRun = !apply;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function manilaDayBounds(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const endKey = next.toISOString().slice(0, 10);
  return {
    start: `${dateKey}T00:00:00+08:00`,
    end: `${endKey}T00:00:00+08:00`,
  };
}

async function main() {
  const { data: leader, error: leaderError } = await supabase
    .from("employees")
    .select("id, employee_id, first_name, last_name, middle_name, region_id")
    .eq("employee_id", LEADER_EMPLOYEE_ID)
    .maybeSingle();

  if (leaderError) throw new Error(leaderError.message);
  if (!leader) {
    console.error(`Team leader ${LEADER_EMPLOYEE_ID} not found.`);
    process.exit(1);
  }

  const { data: region, error: regionError } = await supabase
    .from("library_regions")
    .select("id, name, code")
    .or(`code.ilike.%${REGION_CODE}%,name.ilike.%Caraga%`)
    .eq("is_active", true)
    .maybeSingle();

  if (regionError) throw new Error(regionError.message);
  if (!region) {
    console.error(`Region matching ${REGION_CODE} / Caraga not found.`);
    process.exit(1);
  }

  const { data: regionLeaders, error: rlError } = await supabase
    .from("library_region_team_leaders")
    .select("employee_id")
    .eq("region_id", region.id);

  if (rlError) throw new Error(rlError.message);
  const regionLeaderIds = new Set((regionLeaders ?? []).map((row) => row.employee_id));

  const isLeaderForRegion = regionLeaderIds.has(leader.id);
  if (!isLeaderForRegion) {
    console.warn(
      `Warning: ${LEADER_EMPLOYEE_ID} is not listed as team leader for ${region.name} (${region.code}). Continuing with region members.`
    );
  }

  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select("id, employee_id, first_name, last_name, assigned_team_leader_id, region_id")
    .eq("region_id", region.id);

  if (employeesError) throw new Error(employeesError.message);

  const memberIds = new Set([leader.id]);
  for (const employee of employees ?? []) {
    if (employee.id === leader.id) continue;
    if (regionLeaderIds.has(employee.id)) continue;
    if (employee.assigned_team_leader_id === leader.id) {
      memberIds.add(employee.id);
    }
  }

  const employeeIds = [...memberIds];
  console.log(`Team leader: ${leader.last_name}, ${leader.first_name} (${leader.employee_id})`);
  console.log(`Region: ${region.name} (${region.code})`);
  console.log(`Employees to check: ${employeeIds.length}`);

  const sourceBounds = manilaDayBounds("2026-06-15");
  const { data: accomplishments, error: accError } = await supabase
    .from("employee_accomplishments")
    .select("id, employee_id, content, created_at")
    .in("employee_id", employeeIds)
    .gte("created_at", sourceBounds.start)
    .lt("created_at", sourceBounds.end)
    .order("created_at", { ascending: true });

  if (accError) throw new Error(accError.message);

  const employeeMap = new Map((employees ?? []).map((e) => [e.id, e]));
  employeeMap.set(leader.id, leader);

  if (!accomplishments?.length) {
    console.log(`No accomplishments found for ${sourceBounds.start.slice(0, 10)} (source day). Checking latest...`);
    const { data: latest, error: latestError } = await supabase
      .from("employee_accomplishments")
      .select("id, employee_id, content, created_at")
      .in("employee_id", employeeIds)
      .order("created_at", { ascending: false })
      .limit(30);

    if (latestError) throw new Error(latestError.message);
    for (const row of latest ?? []) {
      const emp = employeeMap.get(row.employee_id);
      const label = emp
        ? `${emp.last_name}, ${emp.first_name} (${emp.employee_id})`
        : row.employee_id;
      console.log(`  - ${label}: ${row.created_at} | ${row.content.slice(0, 60)}...`);
    }
    process.exit(0);
  }

  console.log(`Found ${accomplishments.length} accomplishment(s) to move to ${TARGET_DATE}:`);
  for (const row of accomplishments) {
    const emp = employeeMap.get(row.employee_id);
    const label = emp
      ? `${emp.last_name}, ${emp.first_name} (${emp.employee_id})`
      : row.employee_id;
    console.log(`  - ${label}: ${row.created_at}`);
    console.log(`    ${row.content.slice(0, 80)}${row.content.length > 80 ? "..." : ""}`);
  }

  if (dryRun) {
    console.log("\nDry run only. Re-run with --apply to update created_at to", TARGET_DATE, "Manila time");
    return;
  }

  let updated = 0;
  for (const row of accomplishments) {
    const created = new Date(row.created_at);
    const manilaTime = created.toLocaleString("en-GB", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const [hour, minute, second] = manilaTime.split(":").map((part) => Number(part));
    const target = new Date(`${TARGET_DATE}T00:00:00+08:00`);
    target.setHours(hour, minute, second, created.getMilliseconds());

    const { error: updateError } = await supabase
      .from("employee_accomplishments")
      .update({ created_at: target.toISOString() })
      .eq("id", row.id);

    if (updateError) throw new Error(updateError.message);
    updated += 1;
  }

  console.log(`\nUpdated ${updated} accomplishment(s) to ${TARGET_DATE} (Philippine time)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
