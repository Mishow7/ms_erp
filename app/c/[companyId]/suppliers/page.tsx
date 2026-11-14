"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/Shell";

export default function SuppliersPage() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { fetch(`/api/suppliers?companyId=${companyId}`).then(r=>r.json()).then(d => setList(d.suppliers||[])); }, [companyId]);
  return (
    <AppShell companyId={companyId}>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">الموردون</h1>
      <p className="text-xs text-slate-500">إدارة الموردين وحساباتهم</p>
      <div className="bg-white border rounded-2xl p-4 mt-3">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-600"><th className="p-3 text-right">المورد</th><th className="p-3 text-right">الهاتف</th><th className="p-3 text-right">الرقم الضريبي</th><th className="p-3 text-right">الرصيد</th></tr></thead>
          <tbody>
            {list.map(s => (
              <tr key={s.id} className="border-t hover:bg-slate-50">
                <td className="p-3 font-bold">{s.name}</td>
                <td className="p-3 text-xs">{s.phone || "—"}</td>
                <td className="p-3 text-xs">{s.taxNumber || "—"}</td>
                <td className="p-3 font-bold">{parseFloat(s.balance || "0").toLocaleString("ar-SA")} SAR</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">لا يوجد موردون بعد. أضف موردين من واجهة الموردين.</td></tr>}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
