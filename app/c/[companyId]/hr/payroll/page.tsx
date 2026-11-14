"use client";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import { Suspense } from "react";
function Inner() { return <div className="bg-white border rounded-2xl p-6 text-center"><div className="text-5xl mb-3">💵</div><div className="font-bold">الرواتب</div><div className="text-xs text-slate-500 mt-2">قريباً</div></div>; }
export default function Page() { const p=useParams<{companyId:string}>(); return <AppShell companyId={p.companyId}><Suspense fallback={null}><Inner/></Suspense></AppShell>; }
