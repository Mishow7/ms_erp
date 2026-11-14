import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import { nanoid } from "nanoid";

// In-memory token store (for demo; in production use Redis or DB table with TTL)
const resetTokens = new Map<string, { email: string; expiresAt: number }>();

// Cleanup expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of resetTokens.entries()) {
    if (v.expiresAt < now) resetTokens.delete(k);
  }
}, 60_000);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  try {
    if (action === "request") {
      // Step 1: user requests reset
      const { email } = body;
      if (!email) return NextResponse.json({ error: "البريد مطلوب" }, { status: 400 });
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      // Always return ok to prevent user enumeration, but if user exists, generate token
      if (user) {
        const token = nanoid(48);
        resetTokens.set(token, { email, expiresAt: Date.now() + 30 * 60 * 1000 }); // 30 min
        // In production: send email. For this demo we return the token directly in dev.
        return NextResponse.json({
          ok: true,
          message: "تم إنشاء رمز استعادة كلمة المرور. في بيئة الإنتاج يُرسل إلى بريدك، هنا نعرضه للاختبار.",
          token,
          devToken: token, // for demo
        });
      }
      return NextResponse.json({ ok: true, message: "إن وُجد البريد سيتم إرسال الرمز" });
    }

    if (action === "confirm") {
      // Step 2: user submits token + new password
      const { token, newPassword } = body;
      if (!token || !newPassword) return NextResponse.json({ error: "الرمز وكلمة المرور الجديدة مطلوبان" }, { status: 400 });
      if (newPassword.length < 6) return NextResponse.json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });

      const t = resetTokens.get(token);
      if (!t || t.expiresAt < Date.now()) {
        return NextResponse.json({ error: "الرمز غير صحيح أو منتهي الصلاحية (30 دقيقة)" }, { status: 400 });
      }

      const [user] = await db.select().from(users).where(eq(users.email, t.email)).limit(1);
      if (!user) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

      const hash = await hashPassword(newPassword);
      await db.update(users).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(users.id, user.id));
      resetTokens.delete(token);

      await db.insert(auditLogs).values({
        userId: user.id,
        action: "password_reset",
        entity: "user",
        entityId: user.id,
        details: `استعادة كلمة المرور للمستخدم: ${user.email}`,
        ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({ ok: true, message: "تم تغيير كلمة المرور بنجاح. يمكنك الدخول الآن." });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
