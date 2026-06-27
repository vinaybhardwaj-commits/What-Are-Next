// Build-time, idempotent migration runner (neon-http, no extra deps).
// Runs the committed SQL migrations once; skips if the schema already exists.
// Uses DATABASE_URL injected by the Neon–Vercel integration. Safe to run on
// every build: the sentinel check makes re-runs a no-op.
import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] No DATABASE_URL set — skipping (shell-only build).");
  process.exit(0);
}

const sql = neon(url);

try {
  const present = await sql.query("SELECT to_regclass('public.domains') AS t");
  if (present?.[0]?.t) {
    console.log("[migrate] Schema already present — nothing to do.");
    process.exit(0);
  }

  const dir = "drizzle";
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  let total = 0;
  for (const f of files) {
    const raw = readFileSync(join(dir, f), "utf8");
    const statements = raw
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await sql.query(stmt);
      total++;
    }
    console.log(`[migrate] applied ${f} (${statements.length} statements)`);
  }
  console.log(`[migrate] done — ${total} statements across ${files.length} file(s).`);
} catch (err) {
  console.error("[migrate] FAILED:", err?.message ?? err);
  process.exit(1);
}
