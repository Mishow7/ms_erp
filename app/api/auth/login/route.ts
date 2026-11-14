import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, signSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !user.isActive) return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });

    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      platformRole: user.platformRole,
    };
    const token = await signSession(payload as any);

    await db.insert(auditLogs).values({
      userId: user.id,
      action: "login",
      entity: "user",
      entityId: user.id,
      details: `تسجيل دخول: ${user.email}`,
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, platformRole: user.platformRole } });
    res.cookies.set("ms_session", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
