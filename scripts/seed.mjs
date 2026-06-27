// One-time, idempotent seed from the origin "What Are Next" sheet.
// Runs after migrate in the build; seeds only when the domains table is empty.
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) { console.log("[seed] No DATABASE_URL — skipping."); process.exit(0); }
const sql = neon(url);

try {
  const existing = await sql`SELECT count(*)::int AS c FROM domains`;
  if (existing[0].c > 0) { console.log(`[seed] ${existing[0].c} domains present — skipping.`); process.exit(0); }

  const data = JSON.parse(readFileSync("scripts/seed-data.json", "utf8"));

  const personId = {};
  for (const name of data.people) {
    const r = await sql`INSERT INTO people (name, role) VALUES (${name}, 'Guide') RETURNING id`;
    personId[name] = r[0].id;
  }

  let dOrder = 0;
  for (const d of data.domains) {
    const guideIds = (d.guides || []).map((n) => personId[n]).filter(Boolean);
    const dr = await sql`INSERT INTO domains (name, color, sort_order, guide_person_ids)
                         VALUES (${d.name}, ${d.color}, ${dOrder}, ${guideIds}::uuid[]) RETURNING id`;
    const domainId = dr[0].id; dOrder++;
    let iOrder = 0;
    for (const ini of d.initiatives) {
      const ir = await sql`INSERT INTO initiatives (domain_id, title, gtd_status, sort_order)
                           VALUES (${domainId}, ${ini.title}, ${ini.gtdStatus || "next"}, ${iOrder}) RETURNING id`;
      const initiativeId = ir[0].id; iOrder++;
      let aOrder = 0;
      for (const a of (ini.actions || [])) {
        await sql`INSERT INTO actions (initiative_id, title, gtd_status, sequence, notes, sort_order)
                  VALUES (${initiativeId}, ${a.title}, ${a.gtdStatus || "next"}, ${a.sequence ?? null}, ${a.notes ?? null}, ${aOrder})`;
        aOrder++;
      }
    }
  }
  console.log(`[seed] seeded ${data.domains.length} domains, ${data.people.length} people.`);
} catch (err) {
  console.error("[seed] FAILED:", err?.message ?? err);
  process.exit(1);
}
