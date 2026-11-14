import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, auditLogs, companyMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, ilike } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const companyId = req.nextUrl.searchParams.get("companyId");
  const search = req.nextUrl.searchParams.get("q");
  if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
  // enforce isolation
  if (session.platformRole !== "super_admin") {
    const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
    if (!m) return NextResponse.json({ error: "غير مصرح للوصول" }, { status: 403 });
  }
  let list;
  if (search) {
    list = await db.select().from(customers).where(and(eq(customers.companyId, companyId), ilike(customers.name, `%${search}%`)));
  } else {
    list = await db.select().from(customers).where(eq(customers.companyId, companyId));
  }
  return NextResponse.json({ customers: list });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const { companyId, name, email, phone, taxNumber, address, city } = body;
  if (!companyId || !name) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  if (session.platformRole !== "super_admin") {
    const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
    if (!m) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const [c] = await db.insert(customers).values({
    companyId, name, email, phone, taxNumber, address, city, createdBy: session.userId,
  }).returning();
  await db.insert(auditLogs).values({
    companyId, userId: session.userId, action: "create", entity: "customer", entityId: c.id, details: `إضافة عميل: ${name}`,
  });
  return NextResponse.json({ customer: c });
}
