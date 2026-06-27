import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const COOKIE = "wan_session";
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "dev-insecure-secret-change-me");

export async function verifyPasscode(passcode: string): Promise<boolean> {
  const hash = process.env.PASSCODE_HASH || "";
  if (!hash) return false;
  return bcrypt.compare(passcode, hash);
}

export async function createSession() {
  const token = await new SignJWT({ owner: "V" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  cookies().set(COOKIE, token, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  cookies().delete(COOKIE);
}

export async function isAuthed(): Promise<boolean> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return false;
  try { await jwtVerify(token, secret()); return true; } catch { return false; }
}

export const SESSION_COOKIE = COOKIE;
