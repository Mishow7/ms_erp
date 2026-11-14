import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vouchers, cashAccounts, bankAccounts, ledgerAccounts, companyMembers, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

async function checkAccess(session: any, companyId: string) {
  if (session.platformRole === "super_admin") return true;
  const [m] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
  return !!m;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const companyId = req.nextUrl.searchParams.get("companyId");
    const type = req.nextUrl.searchParams.get("type");
    if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
    if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    let list = await db.select().from(vouchers).where(eq(vouchers.companyId, companyId)).orderBy(desc(vouchers.createdAt)).limit(300);
    if (type) list = list.filter(v => v.type === type);

    const enriched: any[] = [];
    for (const v of list) {
      let cash: any = null, bank: any = null, debit: any = null, credit: any = null;
      if (v.cashAccountId) { const [x] = await db.select().from(cashAccounts).where(eq(cashAccounts.id, v.cashAccountId)).limit(1); cash = x; }
      if (v.bankAccountId) { const [x] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, v.bankAccountId)).limit(1); bank = x; }
      if (v.debitAccountId) { const [x] = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.id, v.debitAccountId)).limit(1); debit = x; }
      if (v.creditAccountId) { const [x] = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.id, v.creditAccountId)).limit(1); credit = x; }
      enriched.push({ ...v, cashAccount: cash, bankAccount: bank, debitAccount: debit, creditAccount: credit });
    }
    return NextResponse.json({ vouchers: enriched });
  } catch (e: any) {
    console.error("[finance/vouchers GET]", e);
    return NextResponse.json({ error: e?.message || "خطأ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const body = await req.json();
    const { companyId, type, voucherDate, cashAccountId, bankAccountId, customerId, supplierId, amount, debitAccountId, creditAccountId, description, reference } = body;
    if (!companyId || !type || !amount) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    if (!["receipt", "payment", "journal"].includes(type)) return NextResponse.json({ error: "نوع السند غير صالح" }, { status: 400 });

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return NextResponse.json({ error: "المبلغ يجب أن يكون موجباً" }, { status: 400 });
    if (type === "receipt" && !cashAccountId && !bankAccountId) return NextResponse.json({ error: "حدد الصندوق أو الحساب البنكي" }, { status: 400 });
    if (type === "payment" && !cashAccountId && !bankAccountId) return NextResponse.json({ error: "حدد الصندوق أو الحساب البنكي" }, { status: 400 });
    if (type === "journal" && (!debitAccountId || !creditAccountId)) return NextResponse.json({ error: "حدد الحساب المدين والدائن" }, { status: 400 });

    // duplicate check
    if (reference) {
      const existing = await db.select().from(vouchers).where(eq(vouchers.companyId, companyId));
      const dup = existing.find(v => v.reference === reference && parseFloat(v.amount) === amt && v.type === type);
      if (dup) return NextResponse.json({ error: "سند بنفس المرجع والمبلغ مسجل مسبقاً" }, { status: 400 });
    }

    const prefix = type === "receipt" ? "RV" : type === "payment" ? "PV" : "JV";
    const voucherNumber = `${prefix}-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;

    const [voucher] = await db.insert(vouchers).values({
      companyId, voucherNumber, type,
      voucherDate: voucherDate ? new Date(voucherDate) : new Date(),
      cashAccountId: cashAccountId || null,
      bankAccountId: bankAccountId || null,
      customerId: customerId || null,
      supplierId: supplierId || null,
      amount: amt.toFixed(2),
      debitAccountId: debitAccountId || null,
      creditAccountId: creditAccountId || null,
      description: description || null,
      reference: reference || null,
      status: "posted",
      createdBy: session.userId,
      postedAt: new Date(),
    }).returning();

    // update cash account balance
    if (cashAccountId) {
      const [ca] = await db.select().from(cashAccounts).where(eq(cashAccounts.id, cashAccountId)).limit(1);
      if (ca) {
        const delta = type === "receipt" ? amt : type === "payment" ? -amt : 0;
        await db.update(cashAccounts).set({ currentBalance: String(parseFloat(ca.currentBalance) + delta), updatedAt: new Date() }).where(eq(cashAccounts.id, cashAccountId));
      }
    }

    await db.insert(auditLogs).values({
      companyId, userId: session.userId, action: "create", entity: "voucher", entityId: voucher.id,
      details: `إنشاء سند ${type} بقيمة ${amt} — ${voucherNumber}`,
    });

    return NextResponse.json({ voucher });
  } catch (e: any) {
    console.error("[finance/vouchers POST]", e);
    return NextResponse.json({ error: e?.message || "خطأ" }, { status: 500 });
  }
}
