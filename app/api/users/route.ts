import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, companyMembers, auditLogs, roles, userRoles } from "@/db/schema";
import { getSession, hashPassword } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    if (session.platformRole !== "super_admin") return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 });
    const all = await db.select().from(users);
    return NextResponse.json({ users: all });
  }
  // check access
  if (session.platformRole !== "super_admin") {
    const [member] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
    if (!member) return NextResponse.json({ error: "غير مصرح للوصول لهذه الشركة" }, { status: 403 });
  }
  const members = await db.select().from(companyMembers).where(eq(companyMembers.companyId, companyId));
  const result = [];
  for (const m of members) {
    const [u] = await db.select().from(users).where(eq(users.id, m.userId)).limit(1);
    if (u) result.push({ ...u, memberRole: m.role, memberId: m.id });
  }
  return NextResponse.json({ users: result });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json();
  const { name, email, password, phone, role, companyId } = body;
  if (!name || !email || !password || !companyId) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });

  if (session.platformRole !== "super_admin") {
    const [member] = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, session.userId), eq(companyMembers.companyId, companyId))).limit(1);
    if (!member) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  // Check duplicate
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let userId: string;
  let newUser;
  if (existing.length > 0) {
    // attach to company if not already
    const [already] = await db.select().from(companyMembers).where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, existing[0].id))).limit(1);
    if (already) return NextResponse.json({ error: "المستخدم مرتبط بالفعل بهذه الشركة" }, { status: 400 });
    userId = existing[0].id;
    newUser = existing[0];
  } else {
    const hash = await hashPassword(password);
    const [u] = await db.insert(users).values({
      name, email, passwordHash: hash, phone, platformRole: role === "company_admin" ? "company_admin" : "employee",
    }).returning();
    newUser = u;
    userId = u.id;
  }

  await db.insert(companyMembers).values({
    companyId, userId, role: role || "employee",
  });

  // assign role if exists
  const [r] = await db.select().from(roles).where(and(eq(roles.companyId, companyId), eq(roles.name, role || "employee"))).limit(1);
  if (r) {
    await db.insert(userRoles).values({ userId, companyId, roleId: r.id });
  }

  await db.insert(auditLogs).values({
    companyId, userId: session.userId, action: "create", entity: "user", entityId: userId, details: `إضافة مستخدم ${name} (${email}) إلى الشركة`,
  });

  return NextResponse.json({ user: newUser });
}
