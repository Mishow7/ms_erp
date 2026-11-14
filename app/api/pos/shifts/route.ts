import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posShifts, posRegisters, posSales, companyMembers, auditLogs, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";

async function checkAccess(session: any, companyId: string) {
  if (session.platformRole === "super_admin") return true;
  const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
  return !!m;
}

export async function GET(req: NextRequest) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
  if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const shifts = await db.select().from(posShifts).where(eq(posShifts.companyId, companyId)).orderBy(desc(posShifts.openedAt));
  // enrich with user name
  const enriched = [];
  for (const s of shifts) {
    const [u] = await db.select().from(users).where(eq(users.id, s.userId)).limit(1);
    enriched.push({ ...s, userName: u?.name });
  }
  return NextResponse.json({ shifts: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const { registerId, openingCash } = body;
  if (!registerId) return NextResponse.json({ error: "registerId مطلوب" }, { status: 400 });
  const [reg] = await db.select().from(posRegisters).where(eq(posRegisters.id, registerId)).limit(1);
  if (!reg) return NextResponse.json({ error: "الصندوق غير موجود" }, { status: 404 });
  if (!await checkAccess(session, reg.companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  // check if there's an open shift for this user on this register
  const open = await db.select().from(posShifts).where(and(eq(posShifts.registerId, registerId), eq(posShifts.userId, session.userId), eq(posShifts.status, "open")));
  if (open.length > 0) return NextResponse.json({ error: "يوجد وردية مفتوحة بالفعل على هذا الصندوق" }, { status: 400 });

  const [shift] = await db.insert(posShifts).values({
    companyId: reg.companyId, registerId, userId: session.userId, openingCash: String(openingCash || 0), status: "open",
  }).returning();
  await db.insert(auditLogs).values({ companyId: reg.companyId, userId: session.userId, action: "open_shift", entity: "pos_shift", entityId: shift.id, details: `فتح وردية — صندوق ${reg.name} — رصيد بداية ${openingCash || 0}` });
  return NextResponse.json({ shift });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const { shiftId, closingCash, notes } = body;
  if (!shiftId || closingCash === undefined) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  const [shift] = await db.select().from(posShifts).where(eq(posShifts.id, shiftId)).limit(1);
  if (!shift) return NextResponse.json({ error: "الوردية غير موجودة" }, { status: 404 });
  if (!await checkAccess(session, shift.companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  if (shift.status !== "open") return NextResponse.json({ error: "الوردية مغلقة بالفعل" }, { status: 400 });

  // compute expected cash from sales
  const sales = await db.select().from(posSales).where(and(eq(posSales.shiftId, shiftId), eq(posSales.status, "completed")));
  let expected = parseFloat(shift.openingCash);
  for (const s of sales) expected += parseFloat(s.paid); // simplified
  const diff = parseFloat(closingCash) - expected;

  const [updated] = await db.update(posShifts).set({
    status: "closed", closingCash: String(closingCash), expectedCash: String(expected), difference: String(diff), notes, closedAt: new Date(),
  }).where(eq(posShifts.id, shiftId)).returning();

  await db.insert(auditLogs).values({ companyId: shift.companyId, userId: session.userId, action: "close_shift", entity: "pos_shift", entityId: shiftId, details: `إغلاق وردية — متوقع ${expected.toFixed(2)} — فعلي ${closingCash} — فرق ${diff.toFixed(2)}` });
  return NextResponse.json({ shift: updated, expected, diff });
}
