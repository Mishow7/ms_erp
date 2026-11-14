import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contracts, contractPayments, customers, invoices, companyMembers, auditLogs, branches } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

async function checkAccess(session: any, companyId: string) {
  if (session.platformRole === "super_admin") return true;
  const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
  return !!m;
}

function isUuid(v: any): boolean {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const companyId = req.nextUrl.searchParams.get("companyId");
    if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
    if (!isUuid(companyId)) return NextResponse.json({ error: "companyId غير صالح" }, { status: 400 });
    if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح للوصول لهذه الشركة" }, { status: 403 });

    const list = await db.select().from(contracts).where(eq(contracts.companyId, companyId)).orderBy(desc(contracts.createdAt));
    const enriched = [];
    for (const c of list) {
      const [cust] = await db.select().from(customers).where(eq(customers.id, c.customerId)).limit(1);
      const payments = await db.select().from(contractPayments).where(eq(contractPayments.contractId, c.id));
      const paid = payments.reduce((a, p) => a + parseFloat(p.amount), 0);
      const remaining = parseFloat(c.totalAmount) - paid;
      enriched.push({ ...c, customer: cust, customerName: cust?.name, customerPhone: cust?.phone, paidAmountComputed: paid, remainingAmount: remaining, paymentsCount: payments.length });
    }
    return NextResponse.json({ contracts: enriched });
  } catch (e: any) {
    console.error("[contracts.GET]", e);
    return NextResponse.json({ error: "خطأ في تحميل العقود" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { companyId, customerId, invoiceId, title, scopeOfWork, terms, notes, totalAmount, deliveryDate, status } = body || {};

    // 1) Validate input
    if (!companyId || !isUuid(companyId)) return NextResponse.json({ error: "معرّف الشركة مطلوب وصالح" }, { status: 400 });
    if (!customerId || !isUuid(customerId)) return NextResponse.json({ error: "يرجى اختيار العميل" }, { status: 400 });
    if (invoiceId && !isUuid(invoiceId)) return NextResponse.json({ error: "معرّف الفاتورة غير صالح" }, { status: 400 });
    if (!scopeOfWork || typeof scopeOfWork !== "string" || scopeOfWork.trim().length < 3) {
      return NextResponse.json({ error: "وصف نطاق العمل مطلوب (3 أحرف على الأقل)" }, { status: 400 });
    }
    const amt = typeof totalAmount === "number" ? totalAmount : parseFloat(totalAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      return NextResponse.json({ error: "إجمالي المبلغ يجب أن يكون رقماً موجباً" }, { status: 400 });
    }
    if (deliveryDate) {
      const d = new Date(deliveryDate);
      if (isNaN(d.getTime())) return NextResponse.json({ error: "تاريخ التسليم غير صحيح" }, { status: 400 });
    }

    // 2) Authorization: ensure user belongs to this company
    if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح بالوصول لهذه الشركة" }, { status: 403 });

    // 3) Verify customer belongs to same company
    const [cust] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!cust) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    if (cust.companyId !== companyId) {
      await db.insert(auditLogs).values({
        companyId, userId: session.userId, action: "create_rejected", entity: "contract",
        details: `محاولة إنشاء عقد بعميل من شركة أخرى: customerId=${customerId}`,
      });
      return NextResponse.json({ error: "العميل لا ينتمي لهذه الشركة" }, { status: 400 });
    }

    // 4) Verify invoice (if provided) belongs to same company
    if (invoiceId) {
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
      if (!inv) return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
      if (inv.companyId !== companyId) {
        return NextResponse.json({ error: "الفاتورة لا تنتمي لهذه الشركة" }, { status: 400 });
      }
    }

    // 5) Idempotency: prevent exact duplicate within 10 seconds (same company, customer, total, scope)
    const tenSecondsAgo = new Date(Date.now() - 10_000);
    const recent = await db.select().from(contracts).where(and(
      eq(contracts.companyId, companyId),
      eq(contracts.customerId, customerId),
      gte(contracts.createdAt, tenSecondsAgo),
    ));
    const dup = recent.find(r => parseFloat(r.totalAmount) === amt && r.scopeOfWork.trim() === scopeOfWork.trim());
    if (dup) {
      return NextResponse.json({ contract: dup, deduped: true });
    }

    // 6) Create contract
    const [branch] = await db.select().from(branches).where(eq(branches.companyId, companyId)).limit(1);
    const contractNumber = `CTR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${nanoid(4).toUpperCase()}`;

    const [contract] = await db.insert(contracts).values({
      companyId,
      branchId: branch?.id || null,
      customerId,
      invoiceId: invoiceId || null,
      contractNumber,
      title: (title && title.trim()) ? title.trim() : `عقد ${cust.name}`,
      status: status && ["draft","pending_approval","approved","in_progress","completed","cancelled"].includes(status) ? status : "draft",
      scopeOfWork: scopeOfWork.trim(),
      terms: terms ? String(terms).trim() || null : null,
      notes: notes ? String(notes).trim() || null : null,
      totalAmount: amt.toFixed(2),
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      createdBy: session.userId,
    }).returning();

    await db.insert(auditLogs).values({
      companyId,
      userId: session.userId,
      action: "create",
      entity: "contract",
      entityId: contract.id,
      details: `إنشاء عقد ${contractNumber} للعميل ${cust.name} — إجمالي ${amt.toFixed(2)} ${cust.companyId === companyId ? "" : "[خاطئ: عميل خارجي]"}`,
    });

    return NextResponse.json({ contract });
  } catch (e: any) {
    // Log full detail server-side; return generic message to client
    console.error("[contracts.POST] error:", e?.message, e?.stack);
    return NextResponse.json({ error: e?.message?.includes("foreign key") ? "مرجع غير صالح (عميل/فاتورة/فرع)" : "فشل إنشاء العقد — حاول مرة أخرى" }, { status: 500 });
  }
}
