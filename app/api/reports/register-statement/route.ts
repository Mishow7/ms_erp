import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posRegisters, posShifts, posSales, posSalePayments, posReturns, posCashMovements, companyMembers, branches } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, gte, lte, desc } from "drizzle-orm";

async function checkAccess(session: any, companyId: string) {
  if (session.platformRole === "super_admin") return true;
  const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
  return !!m;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const companyId = req.nextUrl.searchParams.get("companyId");
    const registerId = req.nextUrl.searchParams.get("registerId");
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
    if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to + "T23:59:59") : new Date();

    const allRegisters = await db.select().from(posRegisters).where(eq(posRegisters.companyId, companyId));
    const regs = registerId ? allRegisters.filter(r => r.id === registerId) : allRegisters;
    if (registerId && regs.length === 0) return NextResponse.json({ error: "الصندوق غير موجود" }, { status: 404 });

    const registerIds = regs.map(r => r.id);
    const allShifts = registerIds.length > 0
      ? await db.select().from(posShifts).where(eq(posShifts.companyId, companyId))
      : [];

    const allSales = await db.select().from(posSales).where(eq(posSales.companyId, companyId));
    const allPayments = registerIds.length > 0
      ? await db.select().from(posSalePayments)
      : [];
    const allReturns = await db.select().from(posReturns).where(eq(posReturns.companyId, companyId));
    const allCashMovs = await db.select().from(posCashMovements).where(eq(posCashMovements.companyId, companyId));

    // build register statements
    const statements: any[] = [];
    for (const reg of regs) {
      const regShifts = allShifts.filter(s => s.registerId === reg.id && new Date(s.openedAt) <= toDate && (s.closedAt ? new Date(s.closedAt) >= fromDate : true));
      const regShiftsIds = new Set(regShifts.map(s => s.id));
      const regSales = allSales.filter(s => regShiftsIds.has(s.shiftId) && new Date(s.createdAt) >= fromDate && new Date(s.createdAt) <= toDate);
      const regSalesIds = new Set(regSales.map(s => s.id));
      const regPayments = allPayments.filter(p => regSalesIds.has(p.saleId));
      const regReturns = allReturns.filter(r => r.registerId === reg.id && new Date(r.createdAt) >= fromDate && new Date(r.createdAt) <= toDate);
      const regCashMovs = allCashMovs.filter(m => regShiftsIds.has(m.shiftId));

      // opening balance = first shift's opening cash
      const opening = regShifts.length > 0 ? parseFloat(regShifts.sort((a,b)=>new Date(a.openedAt).getTime()-new Date(b.openedAt).getTime())[0].openingCash) : 0;

      // build running balance line by line
      const lines: any[] = [];
      let running = opening;
      // opening line
      lines.push({ date: fromDate, type: "opening", doc: "—", desc: "رصيد افتتاحي", debit: opening, credit: 0, balance: running, method: "—", userName: "—" });
      // sales payments
      for (const s of regSales) {
        const ps = regPayments.filter(p => p.saleId === s.id);
        for (const p of ps) {
          running += parseFloat(p.amount);
          lines.push({ date: new Date(s.createdAt), type: "sale", doc: s.receiptNumber, desc: `بيع — ${s.receiptNumber}`, debit: parseFloat(p.amount), credit: 0, balance: running, method: p.method, userName: "—" });
        }
      }
      // returns
      for (const r of regReturns) {
        running -= parseFloat(r.refundAmount);
        lines.push({ date: new Date(r.createdAt), type: "return", doc: r.returnNumber, desc: `مرتجع — ${r.returnNumber}`, debit: 0, credit: parseFloat(r.refundAmount), balance: running, method: r.refundMethod, userName: "—" });
      }
      // cash movements
      for (const m of regCashMovs) {
        const isIn = m.type === "deposit" || m.type === "tip_in";
        const isOut = ["withdrawal","expense","tip_out"].includes(m.type);
        const amt = parseFloat(m.amount);
        if (isIn) { running += amt; lines.push({ date: new Date(m.createdAt), type: m.type, doc: m.id.slice(0,8), desc: m.reason || m.type, debit: amt, credit: 0, balance: running, method: "cash", userName: "—" }); }
        else if (isOut) { running -= amt; lines.push({ date: new Date(m.createdAt), type: m.type, doc: m.id.slice(0,8), desc: m.reason || m.type, debit: 0, credit: amt, balance: running, method: "cash", userName: "—" }); }
        else if (m.type === "adjustment") { running += amt; lines.push({ date: new Date(m.createdAt), type: "adjustment", doc: m.id.slice(0,8), desc: m.reason || "تعديل", debit: amt, credit: 0, balance: running, method: "cash", userName: "—" }); }
      }

      // match with closed shifts
      const shiftCloses = regShifts.filter(s => s.closedAt).map(s => ({
        date: new Date(s.closedAt!),
        type: "shift_close",
        doc: s.id.slice(0,8),
        desc: `إغلاق وردية — فعلي ${s.closingCash} — فرق ${s.difference || 0}`,
        debit: 0, credit: 0, balance: running, method: "—", userName: "—"
      }));

      statements.push({
        register: reg,
        opening, closing: running, lines: [...lines, ...shiftCloses].sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()),
        totals: {
          sales: regSales.reduce((a, s) => a + parseFloat(s.total), 0),
          returns: regReturns.reduce((a, r) => a + parseFloat(r.refundAmount), 0),
          deposits: regCashMovs.filter(m => m.type === "deposit").reduce((a,m)=>a+parseFloat(m.amount), 0),
          withdrawals: regCashMovs.filter(m => m.type === "withdrawal" || m.type === "expense").reduce((a,m)=>a+parseFloat(m.amount), 0),
        }
      });
    }

    return NextResponse.json({ statements, from: fromDate, to: toDate });
  } catch (e: any) {
    console.error("[register-statement]", e);
    return NextResponse.json({ error: "خطأ في تحميل الكشف" }, { status: 500 });
  }
}
