/**
 * ABUSE-2 — Abuse export script.
 *
 * Generates a ZIP package for a given domain containing:
 *   - Postmark send stats for the last 30 days
 *   - abuse_events rows from DB
 *   - purchases row with consent timestamp + ToS version
 *   - Current ToS text (EN)
 *   - Actions taken (suspend timestamp, refund if any)
 *
 * Usage:
 *   pnpm abuse:export <domain>
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   POSTMARK_ACCOUNT_TOKEN
 */

import fs from "fs";
import path from "path";
import archiver from "archiver";
import { createClient } from "@supabase/supabase-js";

const domain = process.argv[2];
if (!domain) {
  console.error("Usage: pnpm abuse:export <domain>");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POSTMARK_ACCOUNT_TOKEN = process.env.POSTMARK_ACCOUNT_TOKEN!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getPostmarkStats(serverToken: string): Promise<unknown> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const res = await fetch(
    `https://api.postmarkapp.com/stats/outbound?fromdate=${since.slice(0, 10)}&todate=${new Date().toISOString().slice(0, 10)}`,
    { headers: { "X-Postmark-Server-Token": serverToken } },
  );
  if (!res.ok) return { error: `HTTP ${res.status}`, note: "stats unavailable" };
  return res.json();
}

async function getServerToken(setupDomain: string): Promise<string | null> {
  const { data } = await db
    .from("setup_runs")
    .select("cf_state")
    .eq("domain", setupDomain)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return (data?.cf_state as Record<string, unknown>)?.postmark
    ? ((data?.cf_state as Record<string, Record<string, unknown>>).postmark?.server_token as string ?? null)
    : null;
}

async function main() {
  console.log(`[abuse-export] Collecting data for domain: ${domain}`);

  const [abuseRows, purchaseRow, serverToken] = await Promise.all([
    db
      .from("abuse_events")
      .select("*")
      .eq("domain", domain)
      .order("created_at", { ascending: false }),
    db
      .from("purchases")
      .select(
        "id, user_email, status, suspended_at, suspension_reason, consent_accepted_at, consent_text_version, created_at, custom_data",
      )
      .contains("custom_data", { domain })
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    getServerToken(domain),
  ]);

  const postmarkStats = serverToken
    ? await getPostmarkStats(serverToken)
    : { note: "No Postmark server token found for this domain" };

  const purchase = purchaseRow.data;
  const tosText = (await import("../lib/legal/terms.js")).TERMS_EN;

  const report = {
    generated_at: new Date().toISOString(),
    domain,
    purchase: purchase ?? null,
    actions_taken: {
      suspended_at: purchase?.suspended_at ?? null,
      suspension_reason: purchase?.suspension_reason ?? null,
      refund: purchase?.status === "refunded" ? { status: "refunded" } : null,
    },
    consent: {
      accepted_at: purchase?.consent_accepted_at ?? null,
      text_version: purchase?.consent_text_version ?? null,
    },
  };

  const outDir = path.resolve("abuse-exports");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const zipPath = path.join(outDir, `abuse-export-${domain}-${Date.now()}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  await new Promise<void>((resolve, reject) => {
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);

    archive.append(JSON.stringify(report, null, 2), { name: "report.json" });
    archive.append(JSON.stringify(abuseRows.data ?? [], null, 2), {
      name: "abuse_events.json",
    });
    archive.append(JSON.stringify(postmarkStats, null, 2), {
      name: "postmark_stats_30d.json",
    });
    archive.append(tosText, { name: "terms_of_service_en.txt" });

    archive.finalize();
  });

  console.log(`[abuse-export] Done: ${zipPath}`);
  console.log(`[abuse-export] Size: ${fs.statSync(zipPath).size} bytes`);
}

main().catch((e) => {
  console.error("[abuse-export] Fatal:", e);
  process.exit(1);
});
