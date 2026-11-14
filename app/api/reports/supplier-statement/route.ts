import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { suppliers, invoices, supplierPayments, creditNotes, companyMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

async function checkAccess(session: any, companyId: string) {
  if (session.platformRole === "super_admin") return true;
  const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
  return !!m;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const companyId = req.nextUrl.searchParams.get("companyId");
    const supplierId = req.nextUrl.searchParams.get("supplierId");
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
    if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const fromDate = from ? new Date(from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to + "T23:59:59") : new Date();

    const allSuppliers = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId));
    const targetSuppliers = supplierId ? allSuppliers.filter(s => s.id === supplierId) : allSuppliers;
    if (supplierId && targetSuppliers.length === 0) return NextResponse.json({ error: "المورد غير موجود" }, { status: 404 });

    const allInvoices = await db.select().from(invoices).where(eq(invoices.companyId, companyId));
    const allPays = await db.select().from(supplierPayments).where(eq(supplierPayments.companyId, companyId));
    const allCns = await db.select().from(creditNotes).where(eq(creditNotes.companyId, companyId));

    const statements: any[] = [];
    for (const sup of targetSuppliers) {
      const lines: any[] = [];
      const beforeInv = allInvoices.filter(i => i.supplierId === sup.id && new Date(i.createdAt) < fromDate);
      const beforePay = allPays.filter(p => p.supplierId === sup.id && new Date(p.paymentDate) < fromDate);
      const opening = beforeInv.reduce((a,i)=>a+parseFloat(i.total),0) - beforePay.reduce((a,p)=>a+parseFloat(p.amount),0);
      let running = opening;
      lines.push({ date: fromDate, type: "opening", doc: "—", desc: "رصيد افتتاحي", debit: opening, credit: 0, balance: running });

      const invs = allInvoices.filter(i => i.supplierId === sup.id && new Date(i.createdAt) >= fromDate && new Date(i.createdAt) <= toDate);
      for (const i of invs) { running += parseFloat(i.total); lines.push({ date: new Date(i.createdAt), type: "invoice", doc: i.invoiceNumber, desc: `فاتورة شراء ${i.invoiceNumber}`, debit: parseFloat(i.total), credit: 0, balance: running }); }
      const pays = allPays.filter(p => p.supplierId === sup.id && new Date(p.paymentDate) >= fromDate && new Date(p.paymentDate) <= toDate);
      for (const p of pays) { running -= parseFloat(p.amount); lines.push({ date: new Date(p.paymentDate), type: "payment", doc: p.id.slice(0,8), desc: `دفعة للمورد — ${p.method}`, debit: 0, credit: parseFloat(p.amount), balance: running }); }
      const cns = allCns.filter(n => n.status === "approved" && n.invoiceId && invs.some(i => i.id === n.invoiceId));
      for (const n of cns) { running -= parseFloat(n.total); lines.push({ date: new Date(n.createdAt), type: "credit_note", doc: n.noteNumber, desc: `إشعار دائن ${n.noteNumber}`, debit: 0, credit: parseFloat(n.total), balance: running }); }

      statements.push({
        supplier: sup, opening, closing: running,
        lines: lines.sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()),
        totals: { invoiced: invs.reduce((a,i)=>a+parseFloat(i.total),0), paid: pays.reduce((a,p)=>a+parseFloat(p.amount),0) }
      });
    }

    return NextResponse.json({ statements, from: fromDate, to: toDate });
  } catch (e: any) { return NextResponse.json({ error: "خطأ" }, { status: 500 }); }
}
