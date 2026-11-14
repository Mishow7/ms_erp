import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, companyMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (session.platformRole === "super_admin" && !companyId) {
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
    return NextResponse.json({ logs });
  }
  if (companyId) {
    if (session.platformRole !== "super_admin") {
      const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
      if (!m) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.companyId, companyId)).orderBy(desc(auditLogs.createdAt)).limit(100);
    return NextResponse.json({ logs });
  }
  return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
}
