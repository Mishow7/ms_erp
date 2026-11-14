import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, companyMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
export async function GET(req: NextRequest){
  const session=await getSession(); if(!session) return NextResponse.json({error:"غير مصرح"},{status:401});
  const companyId=req.nextUrl.searchParams.get("companyId"); if(!companyId) return NextResponse.json({error:"companyId مطلوب"},{status:400});
  if(session.platformRole!=="super_admin"){
    const [m]=await db.select().from(companyMembers).where(and(eq(companyMembers.userId,session.userId),eq(companyMembers.companyId,companyId))).limit(1);
    if(!m) return NextResponse.json({error:"غير مصرح"},{status:403});
  }
  const list=await db.select().from(tasks).where(eq(tasks.companyId,companyId)).orderBy(desc(tasks.createdAt));
  return NextResponse.json({tasks:list});
}
export async function POST(req: NextRequest){
  const session=await getSession(); if(!session) return NextResponse.json({error:"غير مصرح"},{status:401});
  const body=await req.json(); const {companyId,title,description,assigneeId,priority,dueDate}=body;
  if(!companyId||!title) return NextResponse.json({error:"بيانات ناقصة"},{status:400});
  if(session.platformRole!=="super_admin"){
    const [m]=await db.select().from(companyMembers).where(and(eq(companyMembers.userId,session.userId),eq(companyMembers.companyId,companyId))).limit(1);
    if(!m) return NextResponse.json({error:"غير مصرح"},{status:403});
  }
  const [t]=await db.insert(tasks).values({companyId,title,description,assigneeId: assigneeId||null, createdBy: session.userId, priority: priority||"medium", dueDate: dueDate?new Date(dueDate):null}).returning();
  return NextResponse.json({task:t});
}
