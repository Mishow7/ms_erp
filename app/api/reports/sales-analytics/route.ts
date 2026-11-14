import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posSales, posReturns, invoices, inventoryMovements, products, companyMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, gte, lte } from "drizzle-orm";

async function checkAccess(session: any, companyId: string) {
  if (session.platformRole === "super_admin") return true;
  const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
  return !!m;
}

export async function GET(req: NextRequest) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const companyId = req.nextUrl.searchParams.get("companyId");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
  if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();

  const sales = await db.select().from(posSales).where(and(eq(posSales.companyId, companyId), gte(posSales.createdAt, fromDate), lte(posSales.createdAt, toDate)));
  const returns = await db.select().from(posReturns).where(and(eq(posReturns.companyId, companyId), gte(posReturns.createdAt, fromDate), lte(posReturns.createdAt, toDate)));

  // 1. Peak hours report
  const byHour: Record<number, { count: number; total: number }> = {};
  for (let h = 0; h < 24; h++) byHour[h] = { count: 0, total: 0 };
  for (const s of sales) {
    const h = new Date(s.createdAt).getHours();
    byHour[h].count++;
    byHour[h].total += parseFloat(s.total);
  }

  const byDay: Record<string, { count: number; total: number }> = {};
  for (const s of sales) {
    const d = new Date(s.createdAt).toISOString().slice(0, 10);
    if (!byDay[d]) byDay[d] = { count: 0, total: 0 };
    byDay[d].count++;
    byDay[d].total += parseFloat(s.total);
  }

  // 2. Top selling products
  const { posSaleItems } = await import("@/db/schema");
  const allItems = await db.select().from(posSaleItems);
  // filter to company sales
  const companySaleIds = new Set(sales.map(s => s.id));
  const itemsInPeriod = allItems.filter(it => companySaleIds.has(it.saleId));

  // 3. Stock value (current)
  const allProducts = await db.select().from(products).where(eq(products.companyId, companyId));
  const stockValue = allProducts.reduce((a, p) => a + parseFloat(p.cost || "0") * p.stock, 0);
  const lowStock = allProducts.filter(p => p.stock <= (p.minStock || 5));

  // 4. Net sales after returns
  const totalSales = sales.reduce((a, s) => a + parseFloat(s.total), 0);
  const totalReturns = returns.reduce((a, r) => a + parseFloat(r.refundAmount), 0);

  return NextResponse.json({
    peakHours: Object.entries(byHour).map(([h, v]) => ({ hour: `${h}:00`, count: v.count, total: v.total })),
    peakDays: Object.entries(byDay).map(([d, v]) => ({ date: d, count: v.count, total: v.total })),
    topProducts: [], // computed in frontend
    totalSales, totalReturns, netSales: totalSales - totalReturns,
    salesCount: sales.length, returnsCount: returns.length,
    stockValue, lowStockCount: lowStock.length, lowStock,
    period: { from: fromDate, to: toDate },
  });
}
