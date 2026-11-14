import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (session.platformRole !== "super_admin") return NextResponse.json({ error: "صلاحية مالك المنصة فقط" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const allowed = ["name","nameEn","taxNumber","address","phone","email","currency","plan","maxUsers","maxBranches","isActive"];
  const update: any = {};
  for (const k of allowed) if (body[k] !== undefined) update[k] = body[k];
  // drizzle expects snake? our schema uses camel but db columns mapping handled
  // map
  const mapped: any = {};
  if (update.name) mapped.name = update.name;
  if (update.nameEn) mapped.nameEn = update.nameEn;
  if (update.taxNumber) mapped.taxNumber = update.taxNumber;
  if (update.address) mapped.address = update.address;
  if (update.phone) mapped.phone = update.phone;
  if (update.email) mapped.email = update.email;
  if (update.currency) mapped.currency = update.currency;
  if (update.plan) mapped.plan = update.plan;
  if (update.maxUsers) mapped.maxUsers = update.maxUsers;
  if (update.maxBranches) mapped.maxBranches = update.maxBranches;
  if (update.isActive !== undefined) mapped.isActive = update.isActive;
  mapped.updatedAt = new Date();

  const [c] = await db.update(companies).set(mapped).where(eq(companies.id, id)).returning();
  await db.insert(auditLogs).values({
    companyId: id,
    userId: session.userId,
    action: "update",
    entity: "company",
    entityId: id,
    details: `تعديل شركة: ${c.name}`,
  });
  return NextResponse.json({ company: c });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (session.platformRole !== "super_admin") return NextResponse.json({ error: "صلاحية مالك المنصة فقط" }, { status: 403 });
  const { id } = await params;
  await db.update(companies).set({ isActive: false }).where(eq(companies.id, id));
  return NextResponse.json({ ok: true });
}
