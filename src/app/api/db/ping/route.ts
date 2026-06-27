import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ ok: false, error: "no DATABASE_URL" }, { status: 500 });
  try {
    const sql = neon(url);
    const rows = await sql.query(
      "SELECT count(*)::int AS tables FROM information_schema.tables WHERE table_schema='public'"
    );
    const domains = await sql.query("SELECT to_regclass('public.domains') AS t");
    return NextResponse.json({ ok: true, public_tables: rows?.[0]?.tables ?? 0, has_domains: !!domains?.[0]?.t });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
