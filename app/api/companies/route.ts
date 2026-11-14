import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, branches, auditLogs, modules, companyModules, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (session.platformRole !== "super_admin") return NextResponse.json({ error: "صلاحية مالك المنصة فقط" }, { status: 403 });
  const all = await db.select().from(companies).orderBy(companies.createdAt);
  return NextResponse.json({ companies: all });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (session.platformRole !== "super_admin") return NextResponse.json({ error: "صلاحية مالك المنصة فقط" }, { status: 403 });
  const body = await req.json();
  const { name, nameEn, taxNumber, address, phone, email, currency, plan, maxUsers, maxBranches } = body;
  if (!name) return NextResponse.json({ error: "اسم الشركة مطلوب" }, { status: 400 });

  const [company] = await db.insert(companies).values({
    name, nameEn, taxNumber, address, phone, email,
    currency: currency || "SAR",
    plan: plan || "basic",
    maxUsers: maxUsers || 10,
    maxBranches: maxBranches || 5,
    createdBy: session.userId,
  }).returning();

  // create main branch
  await db.insert(branches).values({
    companyId: company.id,
    name: "الفرع الرئيسي",
    isMain: true,
    address: address || "",
  });

  // enable default modules
  const defaultModules = ["sales","inventory","finance","purchases","hr","tasks","reports","settings"];
  for (const m of defaultModules) {
    await db.insert(companyModules).values({ companyId: company.id, moduleKey: m, isEnabled: true });
  }

  await db.insert(auditLogs).values({
    companyId: company.id,
    userId: session.userId,
    action: "create",
    entity: "company",
    entityId: company.id,
    details: `إنشاء شركة: ${name}`,
  });

  return NextResponse.json({ company });
}
