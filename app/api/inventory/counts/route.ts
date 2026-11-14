import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryCounts, inventoryCountItems, products, warehouses, companyMembers, auditLogs } from "@/db/schema";
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
  const counts = await db.select().from(inventoryCounts).where(eq(inventoryCounts.companyId, companyId)).orderBy(desc(inventoryCounts.createdAt));
  return NextResponse.json({ counts });
}

export async function POST(req: NextRequest) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const { companyId, warehouseId, category, countedBy, notes } = body;
  if (!companyId || !warehouseId) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  // snapshot products in warehouse
  const allProducts = await db.select().from(products).where(eq(products.companyId, companyId));
  const filtered = allProducts.filter(p => !category || p.category === category);
  if (filtered.length === 0) return NextResponse.json({ error: "لا توجد أصناف تطابق" }, { status: 400 });

  const countNumber = `CNT-${Date.now().toString().slice(-7)}-${Math.floor(Math.random() * 900 + 100)}`;
  const [count] = await db.insert(inventoryCounts).values({
    companyId, warehouseId, countNumber, category: category || null, status: "draft",
    notes, countedBy, createdBy: session.userId, snapshotAt: new Date(),
  }).returning();

  for (const p of filtered) {
    await db.insert(inventoryCountItems).values({
      countId: count.id, productId: p.id, systemQty: p.stock, countedQty: null, difference: null,
    });
  }

  await db.insert(auditLogs).values({ companyId, userId: session.userId, action: "create", entity: "inventory_count", entityId: count.id, details: `إنشاء نقطة جردية ${countNumber} — ${filtered.length} صنف` });
  return NextResponse.json({ count });
}
