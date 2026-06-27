import { NextResponse } from "next/server";
import { verifyPasscode, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { passcode } = await req.json().catch(() => ({ passcode: "" }));
  if (!passcode || !(await verifyPasscode(passcode))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await createSession();
  return NextResponse.json({ ok: true });
}
