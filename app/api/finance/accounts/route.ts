import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cashAccounts, bankAccounts, ledgerAccounts, companyMembers, branches } from "@/db/schema";
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
    if (!companyId) return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
    if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const cash = await db.select().from(cashAccounts).where(eq(cashAccounts.companyId, companyId));
    const banks = await db.select().from(bankAccounts).where(eq(bankAccounts.companyId, companyId));
    const ledger = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.companyId, companyId));
    const brs = await db.select().from(branches).where(eq(branches.companyId, companyId));
    return NextResponse.json({ cashAccounts: cash, bankAccounts: banks, ledgerAccounts: ledger, branches: brs });
  } catch (e: any) {
    console.error("[finance/accounts]", e);
    return NextResponse.json({ error: e?.message || "خطأ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(); if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const body = await req.json();
    const { companyId, type, name, branchId, currency, openingBalance, bankName, accountNumber, iban, code, accType } = body;
    if (!companyId || !type || !name) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    if (!await checkAccess(session, companyId)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    if (type === "cash") {
      const [acc] = await db.insert(cashAccounts).values({
        companyId, branchId: branchId || null, name,
        currency: currency || "SAR", openingBalance: String(openingBalance || 0),
        currentBalance: String(openingBalance || 0), createdBy: session.userId,
      }).returning();
      return NextResponse.json({ account: acc });
    }

    if (type === "bank") {
      const [acc] = await db.insert(bankAccounts).values({
        companyId, name, bankName: bankName || null, accountNumber: accountNumber || null,
        iban: iban || null, openingBalance: String(openingBalance || 0), currency: currency || "SAR",
      }).returning();
      return NextResponse.json({ account: acc });
    }

    if (type === "ledger") {
      if (!code || !accType) return NextResponse.json({ error: "رمز الحساب ونوعه مطلوبان" }, { status: 400 });
      const [acc] = await db.insert(ledgerAccounts).values({
        companyId, code, name, type: accType, balance: "0", isActive: true,
      }).returning();
      return NextResponse.json({ account: acc });
    }

    return NextResponse.json({ error: "نوع غير معروف" }, { status: 400 });
  } catch (e: any) {
    console.error("[finance/accounts POST]", e);
    return NextResponse.json({ error: e?.message || "خطأ" }, { status: 500 });
  }
}
