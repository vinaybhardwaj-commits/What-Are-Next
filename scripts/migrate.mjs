// Build-time migration runner using Drizzle's neon-http migrator.
// Idempotent: tracks applied migrations in __drizzle_migrations.
// Uses DATABASE_URL injected by the Neon–Vercel integration.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] No DATABASE_URL set — skipping (shell-only build).");
  process.exit(0);
}

try {
  const db = drizzle(neon(url));
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("[migrate] migrations applied (or already up to date).");
} catch (err) {
  console.error("[migrate] FAILED:", err?.message ?? err);
  process.exit(1);
}
