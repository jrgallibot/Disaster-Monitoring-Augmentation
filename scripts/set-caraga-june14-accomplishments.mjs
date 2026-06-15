/**
 * Set June 14, 2026 accomplishments for Lovelyn Galing's Caraga team.
 *
 * Usage:
 *   node scripts/set-caraga-june14-accomplishments.mjs --dry-run
 *   node scripts/set-caraga-june14-accomplishments.mjs --apply
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const LEADER_EMPLOYEE_ID = "16-09388";
const TARGET_DATE = "2026-06-14";

const ACCOMPLISHMENTS = [
  "Our Mobile Kitchen Team successfully prepared and distributed 1,000 packed hot meals for lunch.",
  "Our CCCM Team, with support from the DROMIC and FNI Teams, assisted in the establishment of the required facilities at the 2nd Evacuation Center located at Glan Central Integrated SPED Center. The team also facilitated the distribution of Family Food Packs (FFPs) and Ready-to-Eat Food (RTEF) to 58 Internally Displaced Persons (IDPs) and administered the FACED forms.",
  "Our IT Team successfully enhanced the system requested by FO XII for the monitoring of augmented staff and provided technical assistance in the consolidation of FO XII's DROMIC live file.",
  "We also encoded additional FACED forms that were endorsed to our team today.",
];

const ACCOMPLISHMENT_TIMES = ["09:00:00", "11:30:00", "14:00:00", "16:30:00"];

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

function accomplishmentTimestamp(index) {
  return `${TARGET_DATE}T${ACCOMPLISHMENT_TIMES[index]}+08:00`;
}

async function main() {
  const { data: leader, error: leaderError } = await supabase
    .from("employees")
    .select("id, employee_id, first_name, last_name, user_id, region_id")
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
    .or("code.ilike.%Region XIII%,name.ilike.%Caraga%")
    .eq("is_active", true)
    .maybeSingle();

  if (regionError) throw new Error(regionError.message);
  if (!region) {
    console.error("Region XIII - Caraga not found.");
    process.exit(1);
  }

  const { data: teamMembers, error: teamError } = await supabase
    .from("employees")
    .select("id, employee_id, first_name, last_name, user_id")
    .eq("region_id", region.id)
    .eq("assigned_team_leader_id", leader.id);

  if (teamError) throw new Error(teamError.message);

  const uniqueMembers = (teamMembers ?? []).filter((employee) => employee.id !== leader.id);
  const allEmployees = [leader, ...uniqueMembers];
  const employeeIds = allEmployees.map((employee) => employee.id);
  const bounds = manilaDayBounds(TARGET_DATE);
  const julyBounds = manilaDayBounds("2026-07-14");

  const mobileKitchenPrefix =
    "Our Mobile Kitchen Team successfully prepared and distributed 1,000 packed hot meals";

  const { data: july14Rows, error: julyError } = await supabase
    .from("employee_accomplishments")
    .select("id, employee_id, content")
    .in("employee_id", employeeIds)
    .gte("created_at", julyBounds.start)
    .lt("created_at", julyBounds.end);

  if (julyError) throw new Error(julyError.message);

  const julyDeleteIds = (july14Rows ?? [])
    .filter((row) => row.content.startsWith(mobileKitchenPrefix))
    .map((row) => row.id);

  const { data: june14Rows, error: juneError } = await supabase
    .from("employee_accomplishments")
    .select("id, employee_id, content")
    .in("employee_id", employeeIds)
    .gte("created_at", bounds.start)
    .lt("created_at", bounds.end);

  if (juneError) throw new Error(juneError.message);

  const juneDeleteIds = (june14Rows ?? [])
    .filter((row) => ACCOMPLISHMENTS.some((text) => row.content.trim() === text.trim()))
    .map((row) => row.id);

  const inserts = [];
  for (const employee of allEmployees) {
    for (let index = 0; index < ACCOMPLISHMENTS.length; index += 1) {
      inserts.push({
        employee_id: employee.id,
        user_id: employee.user_id,
        content: ACCOMPLISHMENTS[index],
        latitude: null,
        longitude: null,
        created_at: accomplishmentTimestamp(index),
        shared_by_team_leader_id: employee.id === leader.id ? null : leader.id,
      });
    }
  }

  console.log(`Team leader: ${leader.last_name}, ${leader.first_name} (${leader.employee_id})`);
  console.log(`Region: ${region.name} (${region.code})`);
  console.log(`Employees: ${allEmployees.length}`);
  console.log(`Target date: ${TARGET_DATE} (Philippine time)`);
  console.log(`Accomplishments per employee: ${ACCOMPLISHMENTS.length}`);
  console.log(`Rows to insert: ${inserts.length}`);
  console.log(`July 14 shared rows to remove: ${julyDeleteIds.length}`);
  console.log(`Existing June 14 duplicate rows to remove: ${juneDeleteIds.length}`);
  console.log("\nAccomplishment texts:");
  ACCOMPLISHMENTS.forEach((text, index) => {
    console.log(`  ${index + 1}. ${text.slice(0, 90)}${text.length > 90 ? "..." : ""}`);
  });

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to update the database.");
    return;
  }

  const deleteIds = [...new Set([...julyDeleteIds, ...juneDeleteIds])];
  if (deleteIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("employee_accomplishments")
      .delete()
      .in("id", deleteIds);
    if (deleteError) throw new Error(deleteError.message);
    console.log(`\nDeleted ${deleteIds.length} old accomplishment row(s).`);
  }

  const batchSize = 50;
  let inserted = 0;
  for (let offset = 0; offset < inserts.length; offset += batchSize) {
    const batch = inserts.slice(offset, offset + batchSize);
    const { error: insertError } = await supabase.from("employee_accomplishments").insert(batch);
    if (insertError) throw new Error(insertError.message);
    inserted += batch.length;
  }

  console.log(`Inserted ${inserted} accomplishment row(s) for ${TARGET_DATE}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
