import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companySettings, companyMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

async function checkAccess(session: any, companyId: string) {
  if (session.platformRole === "super_admin") return true;
  const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
  return !!m;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const companyId = req.nextUrl.searchParams.get("companyId");
    if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
    if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    const [s] = await db.select().from(companySettings).where(eq(companySettings.companyId, companyId)).limit(1);
    return NextResponse.json({ settings: s || { companyId, defaultTaxRate: "15", taxMode: "exclusive", taxEnabled: true, posRequireShift: true, posAllowMultipleShiftsPerRegister: false, posRequireManagerApprovalOnClose: false, posCashDiffApprovalThreshold: "50", allowCashCustomerCredit: false } });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const body = await req.json();
    const companyId = body.companyId;
    if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
    if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    // only company_admin or super_admin
    if (session.platformRole !== "super_admin") {
      const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
      if (!m || m.role !== "company_admin") return NextResponse.json({ error: "يحتاج صلاحية مدير الشركة" }, { status: 403 });
    }

    const allowed = ["defaultTaxRate","taxMode","taxEnabled","posRequireShift","posAllowMultipleShiftsPerRegister","posRequireManagerApprovalOnClose","posCashDiffApprovalThreshold","allowCashCustomerCredit","defaultCurrency"];
    const update: any = { companyId };
    for (const k of allowed) if (body[k] !== undefined) update[k] = body[k];

    // upsert
    const existing = await db.select().from(companySettings).where(eq(companySettings.companyId, companyId)).limit(1);
    if (existing.length > 0) {
      await db.update(companySettings).set(update).where(eq(companySettings.companyId, companyId));
    } else {
      await db.insert(companySettings).values(update as any);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
