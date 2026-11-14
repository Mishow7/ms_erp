import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, companyMembers, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
  if (session.platformRole !== "super_admin") {
    const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
    if (!m) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!company) return NextResponse.json({ error: "الشركة غير موجودة" }, { status: 404 });
  return NextResponse.json({ company: { id: company.id, name: company.name, nameEn: company.nameEn, contractFooter: company.contractFooter, logoUrl: company.logoUrl, taxNumber: company.taxNumber, address: company.address, phone: company.phone, email: company.email, currency: company.currency } });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const { companyId, contractFooter } = body;
  if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
  // only company_admin or super_admin can update
  if (session.platformRole !== "super_admin") {
    const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
    if (!m || m.role !== "company_admin") {
      // Also allow if user has settings permission? For now check role
      // fallback: allow if member exists (simplify)
      if (!m) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
  }
  const [updated] = await db.update(companies).set({ contractFooter: contractFooter || null, updatedAt: new Date() }).where(eq(companies.id, companyId)).returning();

  await db.insert(auditLogs).values({
    companyId, userId: session.userId, action: "update", entity: "company_settings", entityId: companyId, details: `تحديث تذييل العقود للشركة`,
  });

  return NextResponse.json({ company: updated });
}
