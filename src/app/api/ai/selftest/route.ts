import { NextResponse } from "next/server";
import { ai } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const text = await ai.complete(
      "clarify",
      "Reply with exactly: What Are Next AI online.",
      "You are a terse smoke-test responder."
    );
    return NextResponse.json({ ok: true, provider: "vertex", text: text.trim() });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
