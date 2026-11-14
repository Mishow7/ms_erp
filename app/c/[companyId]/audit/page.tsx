"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/Shell";
import { useParams } from "next/navigation";

export default function AuditPage(){
  const params=useParams<{companyId:string}>(); const companyId=params.companyId;
  const [logs,setLogs]=useState<any[]>([]);
  useEffect(()=>{fetch(`/api/audit?companyId=${companyId}`).then(r=>r.json()).then(d=>setLogs(d.logs||[]))},[companyId]);
  return (
    <AppShell companyId={companyId}>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">سجل التدقيق</h1>
      <p className="text-xs text-slate-500">تسجيل كل عمليات الدخول والتغييرات المهمة — لا تُعرض كلمات المرور</p>
      <div className="mt-4 bg-white border rounded-2xl p-4">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-600"><th className="p-3 text-right">الوقت</th><th className="p-3 text-right">الإجراء</th><th className="p-3 text-right">الكيان</th><th className="p-3 text-right">التفاصيل</th></tr></thead>
          <tbody>
            {logs.map(l=>(
              <tr key={l.id} className="border-t hover:bg-slate-50">
                <td className="p-3 text-xs">{new Date(l.createdAt).toLocaleString("ar-SA")}</td>
                <td className="p-3"><span className="bg-slate-100 px-2 py-1 rounded-full text-xs">{l.action}</span></td>
                <td className="p-3 text-xs">{l.entity} / {l.entityId?.slice(0,8)}</td>
                <td className="p-3 text-xs">{l.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length===0 && <div className="text-center text-slate-400 py-8">لا يوجد سجل بعد</div>}
        <div className="text-[11px] text-center text-slate-400 mt-3 border-t pt-3">MS للأعمال البرمجية — إعداد وتنفيذ المهندس محمد ماجد العليمي</div>
      </div>
    </AppShell>
  );
}
