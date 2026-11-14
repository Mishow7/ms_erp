import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryCounts, inventoryCountItems, products, companyMembers, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

async function checkAccess(session: any, companyId: string) {
  if (session.platformRole === "super_admin") return true;
  const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
  return !!m;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const [count] = await db.select().from(inventoryCounts).where(eq(inventoryCounts.id, id)).limit(1);
  if (!count) return NextResponse.json({ error: "النقطة غير موجودة" }, { status: 404 });
  if (!await checkAccess(session, count.companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const items = await db.select().from(inventoryCountItems).where(eq(inventoryCountItems.countId, id));
  // enrich with product name
  const enriched: any[] = [];
  for (const it of items) {
    const [p] = await db.select().from(products).where(eq(products.id, it.productId)).limit(1);
    enriched.push({ ...it, productName: p?.name, productSku: p?.sku, unit: p?.unit });
  }
  return NextResponse.json({ count, items: enriched });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const [count] = await db.select().from(inventoryCounts).where(eq(inventoryCounts.id, id)).limit(1);
  if (!count) return NextResponse.json({ error: "النقطة غير موجودة" }, { status: 404 });
  if (!await checkAccess(session, count.companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  if (body.action === "submit_counted") {
    if (count.status !== "draft") return NextResponse.json({ error: "النقطة ليست في حالة مسودة" }, { status: 400 });
    const { items } = body;
    if (!items || !Array.isArray(items)) return NextResponse.json({ error: "بنود مطلوبة" }, { status: 400 });
    for (const it of items) {
      const countedQty = parseInt(it.countedQty);
      const sys = await db.select().from(inventoryCountItems).where(eq(inventoryCountItems.id, it.id)).limit(1);
      if (sys.length > 0) {
        await db.update(inventoryCountItems).set({
          countedQty, difference: countedQty - sys[0].systemQty, notes: it.notes || null,
        }).where(eq(inventoryCountItems.id, it.id));
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "approve") {
    if (count.status !== "pending_approval") return NextResponse.json({ error: "يجب أن تكون في حالة بانتظار الاعتماد" }, { status: 400 });
    if (session.platformRole !== "super_admin") {
      const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, count.companyId))).limit(1);
      if (!m || m.role !== "company_admin") return NextResponse.json({ error: "يتطلب صلاحية مدير الشركة للاعتماد" }, { status: 403 });
    }
    await db.update(inventoryCounts).set({ status: "approved", approvedBy: session.userId, approvedAt: new Date() }).where(eq(inventoryCounts.id, id));
    await db.insert(auditLogs).values({ companyId: count.companyId, userId: session.userId, action: "approve", entity: "inventory_count", entityId: id, details: `اعتماد نقطة جردية ${count.countNumber}` });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "submit_for_approval") {
    if (count.status !== "draft") return NextResponse.json({ error: "حالة غير صحيحة" }, { status: 400 });
    await db.update(inventoryCounts).set({ status: "pending_approval" }).where(eq(inventoryCounts.id, id));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
}
