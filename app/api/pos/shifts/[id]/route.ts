import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posShifts, posSales, posReturns, posCashMovements, posShiftReopens, posRegisters, posSalePayments, companyMembers, auditLogs, users, companySettings } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

async function checkAccess(session: any, companyId: string) {
  if (session.platformRole === "super_admin") return true;
  const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
  return !!m;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const { id } = await params;
    const [shift] = await db.select().from(posShifts).where(eq(posShifts.id, id)).limit(1);
    if (!shift) return NextResponse.json({ error: "الوردية غير موجودة" }, { status: 404 });
    if (!await checkAccess(session, shift.companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const [reg] = await db.select().from(posRegisters).where(eq(posRegisters.id, shift.registerId)).limit(1);
    const [user] = await db.select().from(users).where(eq(users.id, shift.userId)).limit(1);

    // sales in this shift
    const sales = await db.select().from(posSales).where(eq(posSales.shiftId, id));
    // payments per sale
    const allPayments: any[] = [];
    for (const s of sales) {
      const ps = await db.select().from(posSalePayments).where(eq(posSalePayments.saleId, s.id));
      allPayments.push(...ps.map(p => ({ ...p, saleNumber: s.receiptNumber, saleDate: s.createdAt })));
    }
    // returns
    // returns don't have shiftId directly — filter by register + window
    const allReturns = await db.select().from(posReturns).where(eq(posReturns.registerId, shift.registerId));
    const shiftStart = new Date(shift.openedAt);
    const shiftEnd = shift.closedAt ? new Date(shift.closedAt) : new Date();
    const returns = allReturns.filter(r => {
      const d = new Date(r.createdAt);
      return d >= shiftStart && d <= shiftEnd;
    });
    // cash movements
    const cashMovs = await db.select().from(posCashMovements).where(eq(posCashMovements.shiftId, id));
    // reopens
    const reopens = await db.select().from(posShiftReopens).where(eq(posShiftReopens.shiftId, id));

    // compute aggregates by method
    const salesByMethod: Record<string, { count: number; total: number }> = {};
    for (const p of allPayments) {
      const m = p.method;
      if (!salesByMethod[m]) salesByMethod[m] = { count: 0, total: 0 };
      salesByMethod[m].count++;
      salesByMethod[m].total += parseFloat(p.amount);
    }
    const returnsByMethod: Record<string, number> = {};
    for (const r of returns) {
      returnsByMethod[r.refundMethod] = (returnsByMethod[r.refundMethod] || 0) + parseFloat(r.refundAmount);
    }
    const cashMovsSummary = { deposit: 0, withdrawal: 0, expense: 0, tip_in: 0, tip_out: 0, adjustment: 0 };
    for (const cm of cashMovs) cashMovsSummary[cm.type as keyof typeof cashMovsSummary] += parseFloat(cm.amount);

    // expected cash = opening + cash sales - cash refunds + cash deposits - withdrawals - expenses + tip_in - tip_out + adjustments
    const cashSales = salesByMethod.cash?.total || 0;
    const cashRefunds = returnsByMethod.cash || 0;
    const expectedCash = parseFloat(shift.openingCash) + cashSales - cashRefunds
      + cashMovsSummary.deposit - cashMovsSummary.withdrawal - cashMovsSummary.expense
      + cashMovsSummary.tip_in - cashMovsSummary.tip_out + cashMovsSummary.adjustment;

    return NextResponse.json({
      shift: { ...shift, userName: user?.name, registerName: reg?.name },
      sales, payments: allPayments, returns, cashMovements: cashMovs, reopens,
      summary: {
        openingCash: parseFloat(shift.openingCash),
        salesByMethod, returnsByMethod, cashMovsSummary,
        totalSales: sales.reduce((a, s) => a + parseFloat(s.total), 0),
        totalReturns: returns.reduce((a, r) => a + parseFloat(r.refundAmount), 0),
        expectedCash,
        difference: shift.closingCash ? parseFloat(shift.closingCash) - expectedCash : null,
        salesCount: sales.length, returnsCount: returns.length,
      }
    });
  } catch (e: any) {
    console.error("[shift.GET]", e);
    return NextResponse.json({ error: "خطأ في تحميل الوردية" }, { status: 500 });
  }
}

// PATCH: close shift / reopen shift
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const [shift] = await db.select().from(posShifts).where(eq(posShifts.id, id)).limit(1);
    if (!shift) return NextResponse.json({ error: "الوردية غير موجودة" }, { status: 404 });
    if (!await checkAccess(session, shift.companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    if (body.action === "close") {
      if (shift.status !== "open") return NextResponse.json({ error: "الوردية مغلقة بالفعل" }, { status: 400 });
      const { closingCash, notes } = body;
      if (closingCash === undefined || isNaN(parseFloat(closingCash))) return NextResponse.json({ error: "النقد الفعلي مطلوب" }, { status: 400 });

      // compute expected
      const sales = await db.select().from(posSales).where(eq(posSales.shiftId, id));
      // returns for this shift window
      const allReturnsForClose = await db.select().from(posReturns).where(eq(posReturns.registerId, shift.registerId));
      const cs = new Date(shift.openedAt);
      const ce = new Date();
      const returns = allReturnsForClose.filter(r => {
        const d = new Date(r.createdAt);
        return d >= cs && d <= ce;
      });
      const cashMovs = await db.select().from(posCashMovements).where(eq(posCashMovements.shiftId, id));
      let expected = parseFloat(shift.openingCash);
      for (const s of sales) {
        const ps = await db.select().from(posSalePayments).where(eq(posSalePayments.saleId, s.id));
        for (const p of ps) if (p.method === "cash") expected += parseFloat(p.amount);
      }
      for (const r of returns) if (r.refundMethod === "cash") expected -= parseFloat(r.refundAmount);
      for (const cm of cashMovs) {
        if (cm.type === "deposit") expected += parseFloat(cm.amount);
        else if (["withdrawal","expense","tip_out"].includes(cm.type)) expected -= parseFloat(cm.amount);
        else if (cm.type === "tip_in") expected += parseFloat(cm.amount);
        else if (cm.type === "adjustment") expected += parseFloat(cm.amount);
      }
      const diff = parseFloat(closingCash) - expected;

      // check approval policy
      const [settings] = await db.select().from(companySettings).where(eq(companySettings.companyId, shift.companyId)).limit(1);
      const threshold = settings?.posCashDiffApprovalThreshold ? parseFloat(settings.posCashDiffApprovalThreshold) : 50;
      const needsApproval = !!settings?.posRequireManagerApprovalOnClose && Math.abs(diff) > threshold;

      if (needsApproval) {
        // store as pending — for now, set status to "closed" but mark requires_approval
        // we'll save a field via notes for simplicity
        await db.update(posShifts).set({
          status: "closed", closingCash: String(closingCash), expectedCash: String(expected), difference: String(diff),
          notes: (notes || "") + (notes ? "\n" : "") + `[يحتاج اعتماد — فرق ${diff.toFixed(2)}]`, closedAt: new Date(),
        }).where(eq(posShifts.id, id));
        await db.insert(auditLogs).values({ companyId: shift.companyId, userId: session.userId, action: "close_shift_pending_approval", entity: "pos_shift", entityId: id, details: `إغلاق وردية متوقع ${expected.toFixed(2)} — فعلي ${closingCash} — فرق ${diff.toFixed(2)}` });
        return NextResponse.json({ shift: { ...shift, status: "closed", closingCash, expectedCash: expected, difference: diff }, expected, diff, needsApproval: true });
      }

      await db.update(posShifts).set({
        status: "closed", closingCash: String(closingCash), expectedCash: String(expected), difference: String(diff),
        notes: notes || null, closedAt: new Date(),
      }).where(eq(posShifts.id, id));
      await db.insert(auditLogs).values({ companyId: shift.companyId, userId: session.userId, action: "close_shift", entity: "pos_shift", entityId: id, details: `إغلاق وردية — متوقع ${expected.toFixed(2)} — فعلي ${closingCash} — فرق ${diff.toFixed(2)}` });
      return NextResponse.json({ shift: { ...shift, status: "closed", closingCash, expectedCash: expected, difference: diff }, expected, diff });
    }

    if (body.action === "reopen") {
      if (shift.status !== "closed") return NextResponse.json({ error: "الوردية ليست مغلقة" }, { status: 400 });
      // require super_admin or company_admin
      if (session.platformRole !== "super_admin") {
        const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, shift.companyId))).limit(1);
        if (!m || m.role !== "company_admin") return NextResponse.json({ error: "إعادة الفتح تتطلب صلاحية مدير الشركة" }, { status: 403 });
      }
      if (!body.reason) return NextResponse.json({ error: "سبب إعادة الفتح مطلوب" }, { status: 400 });
      await db.insert(posShiftReopens).values({
        shiftId: id, reopenedBy: session.userId, reason: body.reason,
        previousClosingCash: shift.closingCash || "0", newClosingCash: body.newClosingCash || null,
      });
      await db.update(posShifts).set({ status: "open", closedAt: null, closingCash: null }).where(eq(posShifts.id, id));
      await db.insert(auditLogs).values({ companyId: shift.companyId, userId: session.userId, action: "reopen_shift", entity: "pos_shift", entityId: id, details: `إعادة فتح وردية — السبب: ${body.reason}` });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (e: any) {
    console.error("[shift.PATCH]", e);
    return NextResponse.json({ error: e?.message || "خطأ" }, { status: 500 });
  }
}
