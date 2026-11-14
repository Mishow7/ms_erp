import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posRegisters, branches, warehouses, companyMembers, products, customers, companies } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

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
  const registers = await db.select().from(posRegisters).where(eq(posRegisters.companyId, companyId));
  const brs = await db.select().from(branches).where(eq(branches.companyId, companyId));
  const whs = await db.select().from(warehouses).where(eq(warehouses.companyId, companyId));
  const prods = await db.select().from(products).where(eq(products.companyId, companyId));
  const custs = await db.select().from(customers).where(eq(customers.companyId, companyId));
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const companyInfo = company ? {
    id: company.id, name: company.name, nameEn: company.nameEn, logoUrl: company.logoUrl,
    taxNumber: company.taxNumber, address: company.address, phone: company.phone, email: company.email,
    currency: company.currency, contractFooter: company.contractFooter,
  } : null;
  return NextResponse.json({ registers, branches: brs, warehouses: whs, products: prods, customers: custs, company: companyInfo });
}

export async function POST(req: NextRequest) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const { companyId, branchId, warehouseId, name } = body;
  if (!companyId || !branchId || !warehouseId || !name) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const [r] = await db.insert(posRegisters).values({ companyId, branchId, warehouseId, name }).returning();
  return NextResponse.json({ register: r });
}
