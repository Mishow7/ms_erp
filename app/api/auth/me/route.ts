import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { companyMembers, companies } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  const memberships = await db.select().from(companyMembers).where(eq(companyMembers.userId, session.userId));
  // fetch companies for those memberships
  const comps: any[] = [];
  for (const m of memberships) {
    const [c] = await db.select().from(companies).where(eq(companies.id, m.companyId)).limit(1);
    if (c) comps.push({ ...c, memberRole: m.role });
  }
  return NextResponse.json({ user: session, companies: comps, memberships });
}
