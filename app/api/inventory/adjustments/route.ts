import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryAdjustments, inventoryAdjustmentItems, inventoryCounts, products, inventoryCountItems, companyMembers, auditLogs } from "@/db/schema";
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
  const list = await db.select().from(inventoryAdjustments).where(eq(inventoryAdjustments.companyId, companyId)).orderBy(desc(inventoryAdjustments.createdAt));
  return NextResponse.json({ adjustments: list });
}

export async function POST(req: NextRequest) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const { countId, notes, restockDecisions } = body;
  if (!countId) return NextResponse.json({ error: "countId مطلوب" }, { status: 400 });

  const [count] = await db.select().from(inventoryCounts).where(eq(inventoryCounts.id, countId)).limit(1);
  if (!count) return NextResponse.json({ error: "النقطة الجردية غير موجودة" }, { status: 404 });
  if (!await checkAccess(session, count.companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  if (count.status !== "approved") return NextResponse.json({ error: "يجب اعتماد النقطة الجردية أولاً" }, { status: 400 });

  // prevent duplicate
  const existing = await db.select().from(inventoryAdjustments).where(eq(inventoryAdjustments.countId, countId));
  if (existing.some(a => a.status === "approved")) return NextResponse.json({ error: "تم تطبيق تسوية معتمدة لهذه النقطة مسبقاً" }, { status: 400 });

  const items = await db.select().from(inventoryCountItems).where(eq(inventoryCountItems.countId, countId));
  const diffs = items.filter(i => i.countedQty !== null && (i.countedQty - i.systemQty) !== 0);
  if (diffs.length === 0) return NextResponse.json({ error: "لا توجد فروقات في هذه النقطة" }, { status: 400 });

  const adjustmentNumber = `ADJ-${Date.now().toString().slice(-7)}-${Math.floor(Math.random() * 900 + 100)}`;
  const [adj] = await db.insert(inventoryAdjustments).values({
    companyId: count.companyId, countId, adjustmentNumber, status: "draft", notes, createdBy: session.userId,
  }).returning();

  for (const d of diffs) {
    const restockTo = restockDecisions?.[d.id] || "good";
    const [p] = await db.select().from(products).where(eq(products.id, d.productId)).limit(1);
    const costValue = p ? parseFloat(p.cost || "0") * Math.abs((d.countedQty || 0) - d.systemQty) : 0;
    await db.insert(inventoryAdjustmentItems).values({
      adjustmentId: adj.id, productId: d.productId, systemQty: d.systemQty, countedQty: d.countedQty || 0,
      difference: (d.countedQty || 0) - d.systemQty, restockTo, costValue: String(costValue),
    });
  }
  return NextResponse.json({ adjustment: adj });
}
