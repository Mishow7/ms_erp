import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, auditLogs, companyMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, ilike } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const companyId = req.nextUrl.searchParams.get("companyId");
  const search = req.nextUrl.searchParams.get("q");
  if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
  if (session.platformRole !== "super_admin") {
    const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
    if (!m) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  let list;
  if (search) {
    list = await db.select().from(products).where(and(eq(products.companyId, companyId), ilike(products.name, `%${search}%`)));
  } else {
    list = await db.select().from(products).where(eq(products.companyId, companyId));
  }
  return NextResponse.json({ products: list });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const { companyId, name, sku, barcode, category, unit, price, cost, stock, minStock, taxRate } = body;
  if (!companyId || !name || !price) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  if (session.platformRole !== "super_admin") {
    const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
    if (!m) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const [p] = await db.insert(products).values({
    companyId, name, sku, barcode, category, unit, price: String(price), cost: String(cost || 0), stock: stock || 0, minStock: minStock || 5, taxRate: String(taxRate || 15),
  }).returning();
  await db.insert(auditLogs).values({
    companyId, userId: session.userId, action: "create", entity: "product", entityId: p.id, details: `إضافة منتج: ${name}`,
  });
  // inventory movement
  const { inventoryMovements } = await import("@/db/schema");
  await db.insert(inventoryMovements).values({
    companyId, productId: p.id, type: "in", quantity: stock || 0, reference: "افتتاحي",
  });
  return NextResponse.json({ product: p });
}
