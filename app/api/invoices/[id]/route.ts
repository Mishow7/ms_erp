import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems, customers, companyMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const { id } = await params;
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!inv) return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
    if (session.platformRole !== "super_admin") {
      const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, inv.companyId))).limit(1);
      if (!m) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    let customer = null;
    if (inv.customerId) {
      const [c] = await db.select().from(customers).where(eq(customers.id, inv.customerId)).limit(1);
      customer = c;
    }
    return NextResponse.json({ invoice: inv, items, customer });
  } catch (e: any) {
    console.error("[invoice.GET]", e);
    return NextResponse.json({ error: "خطأ في تحميل الفاتورة" }, { status: 500 });
  }
}
