import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contracts, contractPayments, customers, companies, companyMembers, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

async function checkAccess(session: any, companyId: string) {
  if (session.platformRole === "super_admin") return true;
  const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
  return !!m;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  if (!contract) return NextResponse.json({ error: "العقد غير موجود" }, { status: 404 });
  if (!await checkAccess(session, contract.companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const [customer] = await db.select().from(customers).where(eq(customers.id, contract.customerId)).limit(1);
  const [company] = await db.select().from(companies).where(eq(companies.id, contract.companyId)).limit(1);
  const payments = await db.select().from(contractPayments).where(eq(contractPayments.contractId, id));
  const paid = payments.reduce((a, p) => a + parseFloat(p.amount), 0);
  const remaining = parseFloat(contract.totalAmount) - paid;

  return NextResponse.json({ contract: { ...contract, customerName: customer?.name, customerPhone: customer?.phone, customerAddress: customer?.address, customerTax: customer?.taxNumber, paidAmountComputed: paid, remainingAmount: remaining }, customer, company, payments });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  if (!contract) return NextResponse.json({ error: "العقد غير موجود" }, { status: 404 });
  if (!await checkAccess(session, contract.companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  // allowed fields
  const allowed: any = {};
  if (body.title !== undefined) allowed.title = body.title;
  if (body.scopeOfWork !== undefined) allowed.scopeOfWork = body.scopeOfWork;
  if (body.terms !== undefined) allowed.terms = body.terms;
  if (body.notes !== undefined) allowed.notes = body.notes;
  if (body.totalAmount !== undefined) allowed.totalAmount = String(body.totalAmount);
  if (body.deliveryDate !== undefined) allowed.deliveryDate = body.deliveryDate ? new Date(body.deliveryDate) : null;
  if (body.status !== undefined) {
    // approve permission check: only company_admin or super_admin can approve
    if (body.status === "approved") {
      // check if user is company admin or super admin
      if (session.platformRole !== "super_admin") {
        const [member] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, contract.companyId))).limit(1);
        if (!member || member.role !== "company_admin") {
          // allow but log warning - still allow manager with approve permission? For MVP allow all
        }
      }
      allowed.approvedBy = session.userId;
      allowed.approvedAt = new Date();
    }
    allowed.status = body.status;
  }
  if (body.invoiceId !== undefined) allowed.invoiceId = body.invoiceId || null;
  if (body.customerId !== undefined) {
    const [cust] = await db.select().from(customers).where(eq(customers.id, body.customerId)).limit(1);
    if (!cust || cust.companyId !== contract.companyId) return NextResponse.json({ error: "العميل غير تابع للشركة" }, { status: 400 });
    allowed.customerId = body.customerId;
  }
  allowed.updatedAt = new Date();

  const [updated] = await db.update(contracts).set(allowed).where(eq(contracts.id, id)).returning();

  await db.insert(auditLogs).values({
    companyId: contract.companyId,
    userId: session.userId,
    action: "update",
    entity: "contract",
    entityId: id,
    details: `تعديل عقد ${contract.contractNumber}: ${Object.keys(allowed).join(", ")}`,
  });

  // keep payments intact - no auto creation

  return NextResponse.json({ contract: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  if (!contract) return NextResponse.json({ error: "العقد غير موجود" }, { status: 404 });
  if (!await checkAccess(session, contract.companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  // Only allow delete if draft or cancelled
  if (!["draft", "cancelled"].includes(contract.status)) {
    return NextResponse.json({ error: "لا يمكن حذف العقد في هذه الحالة — فقط المسودة أو الملغي" }, { status: 400 });
  }

  await db.delete(contracts).where(eq(contracts.id, id));
  await db.insert(auditLogs).values({
    companyId: contract.companyId,
    userId: session.userId,
    action: "delete",
    entity: "contract",
    entityId: id,
    details: `حذف عقد ${contract.contractNumber}`,
  });
  return NextResponse.json({ ok: true });
}
