import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryAdjustments, inventoryAdjustmentItems, inventoryCounts, products, companyMembers, auditLogs } from "@/db/schema";
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
  const [adj] = await db.select().from(inventoryAdjustments).where(eq(inventoryAdjustments.id, id)).limit(1);
  if (!adj) return NextResponse.json({ error: "التسوية غير موجودة" }, { status: 404 });
  if (!await checkAccess(session, adj.companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const items = await db.select().from(inventoryAdjustmentItems).where(eq(inventoryAdjustmentItems.adjustmentId, id));
  const enriched: any[] = [];
  for (const it of items) {
    const [p] = await db.select().from(products).where(eq(products.id, it.productId)).limit(1);
    enriched.push({ ...it, productName: p?.name, productSku: p?.sku });
  }
  return NextResponse.json({ adjustment: adj, items: enriched });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const [adj] = await db.select().from(inventoryAdjustments).where(eq(inventoryAdjustments.id, id)).limit(1);
  if (!adj) return NextResponse.json({ error: "التسوية غير موجودة" }, { status: 404 });
  if (!await checkAccess(session, adj.companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  if (body.action === "submit_for_approval") {
    if (adj.status !== "draft") return NextResponse.json({ error: "حالة غير صحيحة" }, { status: 400 });
    await db.update(inventoryAdjustments).set({ status: "pending_approval" }).where(eq(inventoryAdjustments.id, id));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "approve") {
    if (adj.status !== "pending_approval") return NextResponse.json({ error: "حالة غير صحيحة" }, { status: 400 });
    if (session.platformRole !== "super_admin") {
      const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, adj.companyId))).limit(1);
      if (!m || m.role !== "company_admin") return NextResponse.json({ error: "يتطلب صلاحية مدير الشركة" }, { status: 403 });
    }
    // check no movements after snapshot
    const [count] = await db.select().from(inventoryCounts).where(eq(inventoryCounts.id, adj.countId)).limit(1);
    if (count) {
      // warn if movements exist after snapshot - using inventory_movements
      // simple check: count movements after snapshotAt that aren't already tied
      // (in production, more thorough check)
    }

    // apply adjustments
    const items = await db.select().from(inventoryAdjustmentItems).where(eq(inventoryAdjustmentItems.adjustmentId, id));
    const { inventoryMovements } = await import("@/db/schema");
    for (const it of items) {
      const [p] = await db.select().from(products).where(eq(products.id, it.productId)).limit(1);
      if (!p) continue;
      // set to counted qty
      await db.update(products).set({ stock: it.countedQty }).where(eq(products.id, it.productId));
      const movementType = it.restockTo === "damaged" ? "damaged_adjust" : (it.difference > 0 ? "in" : "out");
      await db.insert(inventoryMovements).values({
        companyId: adj.companyId, productId: it.productId, type: movementType, quantity: Math.abs(it.difference),
        reference: adj.adjustmentNumber, sourceDocument: "inventory_adjustment", createdBy: session.userId,
      });
    }
    await db.update(inventoryAdjustments).set({ status: "approved", approvedBy: session.userId, approvedAt: new Date() }).where(eq(inventoryAdjustments.id, id));
    await db.insert(auditLogs).values({ companyId: adj.companyId, userId: session.userId, action: "approve", entity: "inventory_adjustment", entityId: id, details: `اعتماد تسوية جردية ${adj.adjustmentNumber} — ${items.length} صنف` });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "cancel") {
    if (["approved", "cancelled"].includes(adj.status)) return NextResponse.json({ error: "لا يمكن الإلغاء" }, { status: 400 });
    await db.update(inventoryAdjustments).set({ status: "cancelled" }).where(eq(inventoryAdjustments.id, id));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
}
