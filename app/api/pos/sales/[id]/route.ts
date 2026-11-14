import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posSales, posSaleItems, posSalePayments, companyMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const [sale] = await db.select().from(posSales).where(eq(posSales.id, id)).limit(1);
  if (!sale) return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
  if (session.platformRole !== "super_admin") {
    const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, sale.companyId))).limit(1);
    if (!m) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const items = await db.select().from(posSaleItems).where(eq(posSaleItems.saleId, id));
  const payments = await db.select().from(posSalePayments).where(eq(posSalePayments.saleId, id));
  return NextResponse.json({ sale, items, payments });
}
