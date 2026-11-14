import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, invoices, customerPayments, posSales, posReturns, creditNotes, contracts, contractPayments, companyMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, gte, lte } from "drizzle-orm";

async function checkAccess(session: any, companyId: string) {
  if (session.platformRole === "super_admin") return true;
  const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
  return !!m;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const companyId = req.nextUrl.searchParams.get("companyId");
    const customerId = req.nextUrl.searchParams.get("customerId");
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
    if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const fromDate = from ? new Date(from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to + "T23:59:59") : new Date();

    const allCustomers = await db.select().from(customers).where(eq(customers.companyId, companyId));
    const targetCustomers = customerId ? allCustomers.filter(c => c.id === customerId) : allCustomers;
    if (customerId && targetCustomers.length === 0) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });

    const allInvoices = await db.select().from(invoices).where(eq(invoices.companyId, companyId));
    const allCustomerPayments = await db.select().from(customerPayments).where(eq(customerPayments.companyId, companyId));
    const allPosSales = await db.select().from(posSales).where(eq(posSales.companyId, companyId));
    const allPosReturns = await db.select().from(posReturns).where(eq(posReturns.companyId, companyId));
    const allCreditNotes = await db.select().from(creditNotes).where(eq(creditNotes.companyId, companyId));

    const statements: any[] = [];
    for (const cust of targetCustomers) {
      const lines: any[] = [];
      let running = 0;

      // opening from invoices before fromDate
      const before = allInvoices.filter(i => i.customerId === cust.id && new Date(i.createdAt) < fromDate);
      const beforePays = allCustomerPayments.filter(p => p.customerId === cust.id && new Date(p.paymentDate) < fromDate);
      const beforePos = allPosSales.filter(s => s.customerId === cust.id && new Date(s.createdAt) < fromDate);
      const opening = before.reduce((a, i) => a + parseFloat(i.total), 0)
        + beforePos.reduce((a, s) => a + parseFloat(s.total), 0)
        - beforePays.reduce((a, p) => a + parseFloat(p.amount), 0);
      running = opening;
      lines.push({ date: fromDate, type: "opening", doc: "—", desc: "رصيد افتتاحي", debit: opening, credit: 0, balance: running });

      // invoices in range
      const invs = allInvoices.filter(i => i.customerId === cust.id && new Date(i.createdAt) >= fromDate && new Date(i.createdAt) <= toDate);
      for (const i of invs) {
        running += parseFloat(i.total);
        lines.push({ date: new Date(i.createdAt), type: "invoice", doc: i.invoiceNumber, desc: `فاتورة ${i.invoiceNumber}`, debit: parseFloat(i.total), credit: 0, balance: running });
      }
      // POS sales
      const pos = allPosSales.filter(s => s.customerId === cust.id && new Date(s.createdAt) >= fromDate && new Date(s.createdAt) <= toDate);
      for (const s of pos) {
        running += parseFloat(s.total);
        lines.push({ date: new Date(s.createdAt), type: "pos_sale", doc: s.receiptNumber, desc: `بيع نقدي ${s.receiptNumber}`, debit: parseFloat(s.total), credit: 0, balance: running });
      }
      // customer payments (collections)
      const pays = allCustomerPayments.filter(p => p.customerId === cust.id && new Date(p.paymentDate) >= fromDate && new Date(p.paymentDate) <= toDate);
      for (const p of pays) {
        running -= parseFloat(p.amount);
        lines.push({ date: new Date(p.paymentDate), type: "payment", doc: p.id.slice(0,8), desc: `تحصيل — ${p.method}`, debit: 0, credit: parseFloat(p.amount), balance: running });
      }
      // POS sales already include cash payment internally — only add returns here (refunds as credit)
      const rets = allPosReturns.filter(r => r.saleId && pos.some(p => p.id === r.saleId));
      for (const r of rets) {
        running -= parseFloat(r.refundAmount);
        lines.push({ date: new Date(r.createdAt), type: "return", doc: r.returnNumber, desc: `مرتجع ${r.returnNumber}`, debit: 0, credit: parseFloat(r.refundAmount), balance: running });
      }
      // credit notes
      const cns = allCreditNotes.filter(n => n.customerId === cust.id && new Date(n.createdAt) >= fromDate && new Date(n.createdAt) <= toDate);
      for (const n of cns) {
        running -= parseFloat(n.total);
        lines.push({ date: new Date(n.createdAt), type: "credit_note", doc: n.noteNumber, desc: `إشعار دائن ${n.noteNumber}`, debit: 0, credit: parseFloat(n.total), balance: running });
      }

      const totalInvoiced = invs.reduce((a,i)=>a+parseFloat(i.total),0) + pos.reduce((a,s)=>a+parseFloat(s.total),0);
      const totalCollected = pays.reduce((a,p)=>a+parseFloat(p.amount),0);

      statements.push({
        customer: cust, opening, closing: running,
        lines: lines.sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()),
        totals: { invoiced: totalInvoiced, collected: totalCollected, returns: rets.reduce((a,r)=>a+parseFloat(r.refundAmount),0), creditNotes: cns.reduce((a,n)=>a+parseFloat(n.total),0) }
      });
    }

    return NextResponse.json({ statements, from: fromDate, to: toDate });
  } catch (e: any) { console.error("[customer-statement]", e); return NextResponse.json({ error: "خطأ" }, { status: 500 }); }
}
