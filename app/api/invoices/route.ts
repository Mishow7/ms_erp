import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems, customers, products, auditLogs, companyMembers, branches } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
  if (session.platformRole !== "super_admin") {
    const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
    if (!m) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const list = await db.select().from(invoices).where(eq(invoices.companyId, companyId)).orderBy(desc(invoices.createdAt));
  return NextResponse.json({ invoices: list });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const { companyId, customerId, items, taxRate, discount, notes, type } = body;
  if (!companyId || !items || items.length === 0) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  if (session.platformRole !== "super_admin") {
    const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
    if (!m) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  // get branch
  const [branch] = await db.select().from(branches).where(eq(branches.companyId, companyId)).limit(1);

  // ===== حساب صحيح على الخادم (لا نعتمد على الواجهة) =====
  const taxEnabled = body.taxEnabled !== false;
  const taxInclusive = body.taxInclusive === true;
  const globalTaxRate = parseFloat(body.taxRate ?? 15);
  const disc = parseFloat(discount || 0);

  let subtotal = 0; // مجموع قبل الضريبة
  let taxTotal = 0;
  for (const it of items) {
    const line = parseFloat(it.quantity) * parseFloat(it.unitPrice);
    const itemDiscount = parseFloat(it.discount || 0);
    const net = Math.max(0, line - itemDiscount);
    const itemRate = it.taxRate !== undefined ? parseFloat(it.taxRate) : globalTaxRate;
    if (taxEnabled) {
      if (taxInclusive) {
        // السعر شامل الضريبة
        const t = net - (net / (1 + itemRate / 100));
        subtotal += net - t;
        taxTotal += t;
      } else {
        subtotal += net;
        taxTotal += net * (itemRate / 100);
      }
    } else {
      subtotal += net;
    }
  }
  const netBeforeTax = Math.max(0, subtotal - disc);
  const tax = Math.round(taxTotal * 100) / 100;
  const total = Math.round((netBeforeTax + tax) * 100) / 100;
  const paid = parseFloat(body.paidAmount || 0);
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;

  // حالة الفاتورة حسب الدفع
  let invStatus = body.status || "sent";
  if (body.paymentMethod === "credit" || paid <= 0) {
    invStatus = paid >= total - 0.001 ? "paid" : "sent";
  } else if (paid >= total - 0.001) {
    invStatus = "paid";
  }

  const [inv] = await db.insert(invoices).values({
    companyId,
    branchId: branch?.id,
    customerId: customerId || null,
    invoiceNumber,
    type: type || "sale",
    status: invStatus as any,
    issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    subtotal: String(Math.round(netBeforeTax * 100) / 100),
    taxRate: String(globalTaxRate),
    taxAmount: String(tax),
    discount: String(disc),
    total: String(total),
    paidAmount: String(paid),
    currency: "SAR",
    notes,
    createdBy: session.userId,
  }).returning();

  for (const it of items) {
    const line = parseFloat(it.quantity) * parseFloat(it.unitPrice);
    const itemDiscount = parseFloat(it.discount || 0);
    await db.insert(invoiceItems).values({
      invoiceId: inv.id,
      productId: it.productId || null,
      productName: it.productName,
      quantity: String(it.quantity),
      unitPrice: String(it.unitPrice),
      total: String(Math.max(0, line - itemDiscount)),
    });
    // reduce stock if sale
    if (it.productId && (type || "sale") === "sale") {
      const [prod] = await db.select().from(products).where(eq(products.id, it.productId)).limit(1);
      if (prod) {
        await db.update(products).set({ stock: prod.stock - parseInt(it.quantity) }).where(eq(products.id, it.productId));
        const { inventoryMovements } = await import("@/db/schema");
        await db.insert(inventoryMovements).values({
          companyId, productId: it.productId, type: "out", quantity: parseInt(it.quantity), reference: invoiceNumber, sourceDocument: "invoice"
        });
      }
    }
  }

  // تسجيل طريقة الدفع في الملاحظات + حساب رصيد العميل عند الدفع الآجل
  if (body.paymentMethod) {
    const methodLabel: Record<string, string> = { cash: "نقدي", card: "بطاقة", transfer: "تحويل بنكي", credit: "آجل" };
    const note = `طريقة الدفع: ${methodLabel[body.paymentMethod] || body.paymentMethod} — المدفوع: ${paid} — المتبقي: ${Math.max(0, total - paid).toFixed(2)}`;
    await db.update(invoices).set({ notes: notes ? `${notes}\n${note}` : note }).where(eq(invoices.id, inv.id));
  }

  if (body.paymentMethod === "credit" && customerId && paid < total - 0.001) {
    const { customers: custTable } = await import("@/db/schema");
    const [cu] = await db.select().from(custTable).where(eq(custTable.id, customerId)).limit(1);
    if (cu) {
      await db.update(custTable).set({ balance: String(parseFloat(cu.balance || "0") + (total - paid)), updatedAt: new Date() }).where(eq(custTable.id, customerId));
    }
  }

  await db.insert(auditLogs).values({
    companyId, userId: session.userId, action: "create", entity: "invoice", entityId: inv.id,
    details: `إنشاء فاتورة ${invoiceNumber} — إجمالي ${total} — ضريبة ${tax} — مدفوع ${paid}`,
  });

  return NextResponse.json({ invoice: inv });
}
