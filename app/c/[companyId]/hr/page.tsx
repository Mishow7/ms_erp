"use client";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/Shell";

function HRInner() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const sp = useSearchParams();
  const sub = sp?.get("sub") || "employees";
  return (
    <>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">الموارد البشرية</h1>
      <p className="text-xs text-slate-500">إدارة الموظفين والحضور والإجازات والرواتب</p>
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mt-3 text-xs">
        {[
          ["employees","الموظفون"],["attendance","الحضور"],["leaves","الإجازات"],["payroll","الرواتب"],["reports","تقارير"]
        ].map(([k,l]) => (
          <a key={k} href={`?sub=${k}`} className={`px-3 py-1.5 rounded-lg ${sub===k?"bg-white shadow font-bold":""}`}>{l}</a>
        ))}
      </div>
      <div className="bg-white border rounded-2xl p-6 mt-3 text-center">
        <div className="text-5xl mb-3">👥</div>
        <div className="font-bold text-lg">وحدة الموارد البشرية</div>
        <div className="text-sm text-slate-500 mt-2">قسم <b>{sub}</b> — هذه الوحدة مخططة وستتاح في التحديثات القادمة</div>
        <div className="text-xs text-slate-400 mt-2">ستشمل: ملفات الموظفين، العقود، الحضور والانصراف، الإجازات، الرواتب والبدلات، تقارير شاملة</div>
      </div>
    </>
  );
}

export default function HRPage() {
  const params = useParams<{ companyId: string }>();
  return <AppShell companyId={params.companyId}><Suspense fallback={<div className="p-10 text-center">جاري التحميل...</div>}><HRInner /></Suspense></AppShell>;
}
