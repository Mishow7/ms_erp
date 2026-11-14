import * as jose from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "ms-secret-key-change-in-prod-2025-super-secure-erp");
const COOKIE_NAME = "ms_session";

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  platformRole: string;
  activeCompanyId?: string | null;
};

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function signSession(payload: SessionPayload) {
  return await new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function requireCompanyAccess(session: SessionPayload | null, companyId: string): boolean {
  if (!session) return false;
  if (session.platformRole === "super_admin") return true;
  // For company users, we will check DB membership in API routes
  return true;
}
