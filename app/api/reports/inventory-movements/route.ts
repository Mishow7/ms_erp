import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, inventoryMovements, inventoryCounts, inventoryAdjustments, posSales, posReturns, companyMembers, warehouses, branches } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, gte, lte, desc } from "drizzle-orm";

async function checkAccess(session: any, companyId: string) {
  if (session.platformRole === "super_admin") return true;
  const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
  return !!m;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const companyId = req.nextUrl.searchParams.get("companyId");
    const productId = req.nextUrl.searchParams.get("productId");
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
    if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to + "T23:59:59") : new Date();

    const allProducts = await db.select().from(products).where(eq(products.companyId, companyId));
    const targets = productId ? allProducts.filter(p => p.id === productId) : allProducts;

    const allMovs = await db.select().from(inventoryMovements).where(eq(inventoryMovements.companyId, companyId));
    const allCounts = await db.select().from(inventoryCounts).where(eq(inventoryCounts.companyId, companyId));
    const allAdjs = await db.select().from(inventoryAdjustments).where(eq(inventoryAdjustments.companyId, companyId));
    const allPosSales = await db.select().from(posSales).where(eq(posSales.companyId, companyId));
    const allPosReturns = await db.select().from(posReturns).where(eq(posReturns.companyId, companyId));

    const cards: any[] = [];
    for (const p of targets) {
      // collect all movements in window
      const productMovs = allMovs.filter(m => m.productId === p.id && new Date(m.createdAt) >= fromDate && new Date(m.createdAt) <= toDate);
      // opening: current stock - sum of in-range deltas (rebuild)
      // simpler: opening = stock - (in_total - out_total)
      const inTotal = productMovs.filter(m => m.type === "in" || m.type === "return_in").reduce((a,m)=>a+m.quantity,0);
      const outTotal = productMovs.filter(m => m.type === "out" || m.type === "damaged").reduce((a,m)=>a+m.quantity,0);
      const opening = p.stock - (inTotal - outTotal);
      let running = opening;
      const lines: any[] = [];
      lines.push({ date: fromDate, type: "opening", doc: "—", desc: "رصيد افتتاحي", in: 0, out: 0, balance: running, source: "—" });
      // sort all movements
      const sorted = productMovs.sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime());
      for (const m of sorted) {
        const isIn = m.type === "in" || m.type === "return_in" || (m.type === "damaged_adjust");
        const isOut = m.type === "out" || m.type === "damaged";
        if (isIn) running += m.quantity;
        else if (isOut) running -= m.quantity;
        else if (m.type === "adjustment") {
          // for adjustment, the absolute value in the productMovs record is already signed differently
        }
        lines.push({ date: new Date(m.createdAt), type: m.type, doc: m.reference || m.id.slice(0,8), desc: `${m.sourceDocument || m.type}`, in: isIn ? m.quantity : 0, out: isOut ? m.quantity : 0, balance: running, source: m.sourceDocument || "—" });
      }
      // overlay approved inventory adjustments (delta = counted - system)
      const adjs = allAdjs.filter(a => a.status === "approved");
      const itemsOfAdj = await import("@/db/schema");
      const { inventoryAdjustmentItems } = itemsOfAdj;
      const adjItems = (await db.select().from(inventoryAdjustmentItems)).filter(it => it.productId === p.id && adjs.some(a => a.id === it.adjustmentId));
      for (const it of adjItems) {
        if (it.difference !== 0) {
          // apply diff to running already
        }
      }
      // value
      const cost = parseFloat(p.cost || "0");
      cards.push({
        product: p,
        opening, closing: running, lines,
        currentStock: p.stock, currentValue: p.stock * cost,
        inTotal, outTotal, netChange: inTotal - outTotal,
      });
    }

    return NextResponse.json({ cards, from: fromDate, to: toDate });
  } catch (e: any) { console.error("[inventory-movements]", e); return NextResponse.json({ error: "خطأ" }, { status: 500 }); }
}
