import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { branches, companyMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
export async function GET(req: NextRequest){
  const session = await getSession(); if(!session) return NextResponse.json({error:"غير مصرح"},{status:401});
  const companyId=req.nextUrl.searchParams.get("companyId"); if(!companyId) return NextResponse.json({error:"companyId مطلوب"},{status:400});
  if(session.platformRole!=="super_admin"){
    const [m]=await db.select().from(companyMembers).where(and(eq(companyMembers.userId,session.userId),eq(companyMembers.companyId,companyId))).limit(1);
    if(!m) return NextResponse.json({error:"غير مصرح"},{status:403});
  }
  const list=await db.select().from(branches).where(eq(branches.companyId,companyId));
  return NextResponse.json({branches:list});
}
export async function POST(req: NextRequest){
  const session=await getSession(); if(!session) return NextResponse.json({error:"غير مصرح"},{status:401});
  const body=await req.json(); const {companyId,name,address,phone}=body;
  if(!companyId||!name) return NextResponse.json({error:"بيانات ناقصة"},{status:400});
  if(session.platformRole!=="super_admin"){
    const [m]=await db.select().from(companyMembers).where(and(eq(companyMembers.userId,session.userId),eq(companyMembers.companyId,companyId))).limit(1);
    if(!m) return NextResponse.json({error:"غير مصرح"},{status:403});
  }
  const [b]=await db.insert(branches).values({companyId,name,address,phone}).returning();
  return NextResponse.json({branch:b});
}
