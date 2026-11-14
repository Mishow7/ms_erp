import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posSales, posSaleItems, posReturns, posReturnItems, products, companyMembers, auditLogs } from "@/db/schema";
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
  const list = await db.select().from(posReturns).where(eq(posReturns.companyId, companyId)).orderBy(desc(posReturns.createdAt));
  return NextResponse.json({ returns: list });
}

export async function POST(req: NextRequest) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const { saleId, items, reason, refundMethod, restockTo } = body;
  if (!saleId || !items || items.length === 0) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });

  const [sale] = await db.select().from(posSales).where(eq(posSales.id, saleId)).limit(1);
  if (!sale) return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
  if (!await checkAccess(session, sale.companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  // verify each item qty <= (sold - already returned)
  for (const it of items) {
    const [si] = await db.select().from(posSaleItems).where(eq(posSaleItems.id, it.saleItemId)).limit(1);
    if (!si) return NextResponse.json({ error: "بند غير موجود" }, { status: 400 });
    if (it.quantity + si.returnedQty > si.quantity) {
      return NextResponse.json({ error: `لا يمكن إرجاع ${it.quantity} من ${si.productName} — تم بيع ${si.quantity} ومرتجع ${si.returnedQty}` }, { status: 400 });
    }
  }

  const refundAmount = items.reduce((a: number, it: any) => a + parseFloat(it.unitPrice) * it.quantity, 0);
  const returnNumber = `RET-${Date.now().toString().slice(-7)}-${Math.floor(Math.random() * 900 + 100)}`;

  const [ret] = await db.insert(posReturns).values({
    companyId: sale.companyId, saleId, registerId: sale.registerId, userId: session.userId,
    returnNumber, reason, refundMethod, refundAmount: String(refundAmount), restockTo: restockTo || "good",
  }).returning();

  for (const it of items) {
    await db.insert(posReturnItems).values({
      returnId: ret.id, productId: it.productId, productName: it.productName, quantity: it.quantity, unitPrice: String(it.unitPrice),
      total: String(parseFloat(it.unitPrice) * it.quantity),
    });
    // update returned qty
    const [si] = await db.select().from(posSaleItems).where(eq(posSaleItems.id, it.saleItemId)).limit(1);
    if (si) await db.update(posSaleItems).set({ returnedQty: si.returnedQty + it.quantity }).where(eq(posSaleItems.id, si.id));
    // restock: if good, add to stock; if damaged, log but don't add to good stock
    const [p] = await db.select().from(products).where(eq(products.id, it.productId)).limit(1);
    if (p) {
      const { inventoryMovements } = await import("@/db/schema");
      if (restockTo === "good") {
        await db.update(products).set({ stock: p.stock + it.quantity }).where(eq(products.id, p.id));
        await db.insert(inventoryMovements).values({
          companyId: sale.companyId, productId: it.productId, type: "in", quantity: it.quantity,
          reference: returnNumber, sourceDocument: "pos_return", createdBy: session.userId,
        });
      } else {
        await db.insert(inventoryMovements).values({
          companyId: sale.companyId, productId: it.productId, type: "damaged", quantity: it.quantity,
          reference: returnNumber, sourceDocument: "pos_return", createdBy: session.userId,
        });
      }
    }
  }

  await db.insert(auditLogs).values({ companyId: sale.companyId, userId: session.userId, action: "pos_return", entity: "pos_return", entityId: ret.id, details: `مرتجع ${returnNumber} — مرتبط بفاتورة ${sale.receiptNumber} — قيمة ${refundAmount} — ${restockTo === "good" ? "إعادة للمخزون" : "تالف"}` });
  return NextResponse.json({ return: ret });
}
