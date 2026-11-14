import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, inventoryMovements, companyMembers } from "@/db/schema";
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
  const daysParam = parseInt(req.nextUrl.searchParams.get("days") || "90");
  if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
  if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const allProducts = await db.select().from(products).where(eq(products.companyId, companyId));
  const cutoff = new Date(Date.now() - daysParam * 24 * 60 * 60 * 1000);
  const movements = await db.select().from(inventoryMovements).where(eq(inventoryMovements.companyId, companyId));

  const result: any[] = [];
  for (const p of allProducts) {
    const productMovs = movements.filter(m => m.productId === p.id);
    const lastMove = productMovs.length > 0 ? productMovs.reduce((a, b) => a.createdAt > b.createdAt ? a : b) : null;
    const hasSufficientData = productMovs.length >= 2;
    const isStale = hasSufficientData && lastMove && lastMove.createdAt < cutoff;
    if (isStale) {
      result.push({
        productId: p.id, productName: p.name, sku: p.sku, category: p.category,
        currentStock: p.stock, lastMovement: lastMove?.createdAt, costValue: parseFloat(p.cost || "0") * p.stock,
        daysSinceLastMovement: Math.floor((Date.now() - new Date(lastMove!.createdAt).getTime()) / (24 * 60 * 60 * 1000)),
        movementCount: productMovs.length,
      });
    }
  }
  return NextResponse.json({ staleStock: result, totalValue: result.reduce((a, r) => a + r.costValue, 0) });
}
