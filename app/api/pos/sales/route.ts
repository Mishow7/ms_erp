import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posSales, posSaleItems, posSalePayments, posShifts, posRegisters, products, companyMembers, auditLogs, invoices, invoiceItems, customers } from "@/db/schema";
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
  const sales = await db.select().from(posSales).where(eq(posSales.companyId, companyId)).orderBy(desc(posSales.createdAt)).limit(200);
  // enrich with customer name
  const enriched: any[] = [];
  for (const s of sales) {
    let custName = "عميل نقدي";
    if (s.customerId) {
      const [c] = await db.select().from(customers).where(eq(customers.id, s.customerId)).limit(1);
      custName = c?.name || "عميل";
    }
    enriched.push({ ...s, customerName: custName });
  }
  return NextResponse.json({ sales: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const { shiftId, customerId, items, payments, discount, taxRate, taxMode, taxEnabled, notes } = body;
  if (!shiftId || !items || items.length === 0) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });

  const [shift] = await db.select().from(posShifts).where(eq(posShifts.id, shiftId)).limit(1);
  if (!shift) return NextResponse.json({ error: "الوردية غير موجودة" }, { status: 404 });
  if (shift.status !== "open") return NextResponse.json({ error: "الوردية مغلقة" }, { status: 400 });
  if (!await checkAccess(session, shift.companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  if (shift.userId !== session.userId && session.platformRole !== "super_admin") return NextResponse.json({ error: "لا يمكنك البيع في وردية مستخدم آخر" }, { status: 403 });

  const [register] = await db.select().from(posRegisters).where(eq(posRegisters.id, shift.registerId)).limit(1);

  // verify stock
  for (const it of items) {
    const [p] = await db.select().from(products).where(eq(products.id, it.productId)).limit(1);
    if (!p) return NextResponse.json({ error: `المنتج غير موجود` }, { status: 400 });
    if (p.stock < it.quantity) return NextResponse.json({ error: `الكمية غير كافية للمنتج: ${p.name} (المتوفر ${p.stock})` }, { status: 400 });
  }

  // احسب الإجمالي على الخادم أيضاً (لا نعتمد على الواجهة)
  let subtotal = 0;
  let itemDiscounts = 0;
  for (const it of items) {
    const line = parseFloat(it.unitPrice) * it.quantity;
    subtotal += line;
    itemDiscounts += parseFloat(it.discount || 0);
  }
  const extraDisc = parseFloat(discount || 0);
  const totalDiscount = itemDiscounts + extraDisc;
  const netBeforeTax = Math.max(0, subtotal - totalDiscount);
  const taxOn = taxEnabled !== false; // default true
  const tr = parseFloat(taxRate ?? 15);
  const tm = taxMode === "inclusive" ? "inclusive" : "exclusive";
  let tax = 0;
  let total = netBeforeTax;
  if (taxOn) {
    if (tm === "inclusive") {
      tax = netBeforeTax - (netBeforeTax / (1 + tr / 100));
      total = netBeforeTax;
    } else {
      tax = netBeforeTax * (tr / 100);
      total = netBeforeTax + tax;
    }
  }
  // تقريب بدقة سنت
  tax = Math.round(tax * 100) / 100;
  total = Math.round(total * 100) / 100;

  const paidTotal = (payments || []).reduce((a: number, p: any) => a + parseFloat(p.amount), 0);
  const creditPayments = (payments || []).filter((p: any) => p.method === "credit").reduce((a: number, p: any) => a + parseFloat(p.amount), 0);
  if (creditPayments > 0 && !customerId) {
    return NextResponse.json({ error: "البيع الآجل يتطلب اختيار عميل" }, { status: 400 });
  }
  if (paidTotal + 0.001 < total) return NextResponse.json({ error: "المبلغ المستلم أقل من الإجمالي" }, { status: 400 });
  const change = paidTotal - total;
  // invoice status based on payment
  let invStatus: "paid" | "sent" | "draft" = "paid";
  if (creditPayments > 0 && paidTotal - creditPayments < total - 0.001) {
    invStatus = "sent";
  }

  const receiptNumber = `POS-${Date.now().toString().slice(-7)}-${Math.floor(Math.random() * 900 + 100)}`;

  // create sales invoice
  const [inv] = await db.insert(invoices).values({
    companyId: shift.companyId,
    branchId: register?.branchId,
    customerId: customerId || null,
    invoiceNumber: receiptNumber,
    type: "sale",
    status: invStatus,
    subtotal: String(subtotal),
    taxRate: String(tr),
    taxAmount: String(tax),
    discount: String(totalDiscount),
    total: String(total),
    paidAmount: String(paidTotal),
    currency: "SAR",
    notes: notes || null,
    createdBy: session.userId,
  }).returning();

  // create pos sale
  const [sale] = await db.insert(posSales).values({
    companyId: shift.companyId,
    invoiceId: inv.id,
    shiftId,
    registerId: shift.registerId,
    userId: session.userId,
    customerId: customerId || null,
    receiptNumber,
    subtotal: String(subtotal),
    discount: String(totalDiscount),
    taxRate: String(tr),
    taxAmount: String(tax),
    total: String(total),
    paid: String(paidTotal),
    change: String(change),
    status: "completed",
  }).returning();

  for (const it of items) {
    const lineNet = parseFloat(it.unitPrice) * it.quantity - parseFloat(it.discount || 0);
    await db.insert(posSaleItems).values({
      saleId: sale.id,
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: String(it.unitPrice),
      discount: String(it.discount || 0),
      total: String(lineNet),
      returnedQty: 0,
    });
    await db.insert(invoiceItems).values({
      invoiceId: inv.id, productId: it.productId, productName: it.productName,
      quantity: String(it.quantity), unitPrice: String(it.unitPrice),
      total: String(lineNet),
    });
    // reduce stock + log movement
    const [p] = await db.select().from(products).where(eq(products.id, it.productId)).limit(1);
    if (p) {
      await db.update(products).set({ stock: p.stock - it.quantity }).where(eq(products.id, it.productId));
      const { inventoryMovements } = await import("@/db/schema");
      await db.insert(inventoryMovements).values({
        companyId: shift.companyId, productId: it.productId, type: "out", quantity: it.quantity,
        reference: receiptNumber, sourceDocument: "pos_sale", createdBy: session.userId,
      });
    }
  }

  for (const p of (payments || [])) {
    await db.insert(posSalePayments).values({ saleId: sale.id, method: p.method, amount: String(p.amount), reference: p.reference || null });
  }

  // تحديث رصيد العميل للدفع الآجل
  if (creditPayments > 0 && customerId) {
    const [cust] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (cust) {
      const newBal = parseFloat(cust.balance || "0") + creditPayments;
      await db.update(customers).set({ balance: String(newBal), updatedAt: new Date() }).where(eq(customers.id, customerId));
    }
  }

  await db.insert(auditLogs).values({ companyId: shift.companyId, userId: session.userId, action: "pos_sale", entity: "pos_sale", entityId: sale.id, details: `بيع POS ${receiptNumber} — إجمالي ${total.toFixed(2)} — ${items.length} بند — آجل: ${creditPayments.toFixed(2)}` });
  return NextResponse.json({ sale, invoiceId: inv.id, items: items.map((it: any) => ({ productName: it.productName, quantity: it.quantity, unitPrice: it.unitPrice, total: parseFloat(it.unitPrice) * it.quantity - parseFloat(it.discount || 0) })) });
}
