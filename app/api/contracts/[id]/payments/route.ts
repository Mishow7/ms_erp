import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contracts, contractPayments, companyMembers, auditLogs } from "@/db/schema";
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
  const payments = await db.select().from(contractPayments).where(eq(contractPayments.contractId, id)).orderBy(contractPayments.paymentDate);
  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { amount, paymentDate, method, reference, notes } = body;
  if (!amount || parseFloat(amount) <= 0) return NextResponse.json({ error: "مبلغ الدفعة مطلوب" }, { status: 400 });

  const [contract] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  if (!contract) return NextResponse.json({ error: "العقد غير موجود" }, { status: 404 });
  if (!await checkAccess(session, contract.companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  // prevent duplicate by reference + amount + date if provided
  if (reference) {
    const existing = await db.select().from(contractPayments).where(eq(contractPayments.contractId, id));
    const dup = existing.find(p => p.reference === reference && p.amount === String(amount));
    if (dup) return NextResponse.json({ error: "الدفعة مكررة — نفس المرجع والمبلغ مسجل مسبقاً" }, { status: 400 });
  }

  // ensure not overpay beyond total (optional warning but allow? enforce)
  const existingPayments = await db.select().from(contractPayments).where(eq(contractPayments.contractId, id));
  const paidSoFar = existingPayments.reduce((a, p) => a + parseFloat(p.amount), 0);
  const wouldBePaid = paidSoFar + parseFloat(amount);
  if (wouldBePaid > parseFloat(contract.totalAmount) + 0.001) {
    return NextResponse.json({ error: `المبلغ المدفوع سيتجاوز إجمالي العقد. المدفوع حالياً ${paidSoFar} — الإجمالي ${contract.totalAmount}` }, { status: 400 });
  }

  const [payment] = await db.insert(contractPayments).values({
    companyId: contract.companyId,
    contractId: id,
    amount: String(amount),
    paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
    method: method || "cash",
    reference: reference || null,
    notes: notes || null,
    createdBy: session.userId,
  }).returning();

  await db.insert(auditLogs).values({
    companyId: contract.companyId,
    userId: session.userId,
    action: "create",
    entity: "contract_payment",
    entityId: payment.id,
    details: `إضافة دفعة ${amount} للعقد ${contract.contractNumber} — المرجع: ${reference || "بدون"}`,
  });

  return NextResponse.json({ payment });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id: contractId } = await params;
  const paymentId = req.nextUrl.searchParams.get("paymentId");
  if (!paymentId) return NextResponse.json({ error: "paymentId مطلوب" }, { status: 400 });

  const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId)).limit(1);
  if (!contract) return NextResponse.json({ error: "العقد غير موجود" }, { status: 404 });
  if (!await checkAccess(session, contract.companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const [payment] = await db.select().from(contractPayments).where(eq(contractPayments.id, paymentId)).limit(1);
  if (!payment || payment.contractId !== contractId) return NextResponse.json({ error: "الدفعة غير موجودة" }, { status: 404 });

  await db.delete(contractPayments).where(eq(contractPayments.id, paymentId));

  await db.insert(auditLogs).values({
    companyId: contract.companyId,
    userId: session.userId,
    action: "delete",
    entity: "contract_payment",
    entityId: paymentId,
    details: `إلغاء دفعة ${payment.amount} من العقد ${contract.contractNumber}`,
  });

  return NextResponse.json({ ok: true });
}
