import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posCashMovements, posShifts, companyMembers, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";

async function checkAccess(session: any, companyId: string) {
  if (session.platformRole === "super_admin") return true;
  const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
  return !!m;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const companyId = req.nextUrl.searchParams.get("companyId");
    const shiftId = req.nextUrl.searchParams.get("shiftId");
    if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
    if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    let list;
    if (shiftId) list = await db.select().from(posCashMovements).where(eq(posCashMovements.shiftId, shiftId));
    else list = await db.select().from(posCashMovements).where(eq(posCashMovements.companyId, companyId)).orderBy(desc(posCashMovements.createdAt));
    return NextResponse.json({ movements: list });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const body = await req.json();
    const { shiftId, type, amount, reason, reference } = body;
    if (!shiftId || !type || !amount) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    if (!["deposit","withdrawal","expense","tip_in","tip_out","adjustment"].includes(type)) return NextResponse.json({ error: "نوع غير صالح" }, { status: 400 });
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return NextResponse.json({ error: "المبلغ يجب أن يكون موجباً" }, { status: 400 });

    const [shift] = await db.select().from(posShifts).where(eq(posShifts.id, shiftId)).limit(1);
    if (!shift) return NextResponse.json({ error: "الوردية غير موجودة" }, { status: 404 });
    if (shift.status !== "open") return NextResponse.json({ error: "الوردية مغلقة" }, { status: 400 });
    if (!await checkAccess(session, shift.companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const [mv] = await db.insert(posCashMovements).values({
      companyId: shift.companyId, shiftId, type, amount: amt.toFixed(2), reason, reference, createdBy: session.userId,
    }).returning();
    await db.insert(auditLogs).values({ companyId: shift.companyId, userId: session.userId, action: "cash_movement", entity: "pos_cash_movement", entityId: mv.id, details: `حركة نقدية ${type} بمبلغ ${amt} على وردية ${shiftId}${reason ? " — " + reason : ""}` });
    return NextResponse.json({ movement: mv });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
