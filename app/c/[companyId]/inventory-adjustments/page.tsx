"use client";
import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import Link from "next/link";

function ListInner() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { fetch(`/api/inventory/adjustments?companyId=${companyId}`).then(r => r.json()).then(d => setList(d.adjustments || [])); }, [companyId]);
  return (
    <AppShell companyId={companyId}>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">التسويات الجردية</h1>
      <p className="text-xs text-slate-500">منشأة من نقاط جردية معتمدة — لا تعدل المخزون قبل الاعتماد</p>
      <div className="bg-white border rounded-2xl p-4 mt-3">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-600"><th className="p-3 text-right">رقم التسوية</th><th className="p-3 text-right">النقطة</th><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">التاريخ</th><th className="p-3 text-right">إجراءات</th></tr></thead>
          <tbody>
            {list.map(a => (
              <tr key={a.id} className="border-t hover:bg-slate-50">
                <td className="p-3 font-mono font-bold">{a.adjustmentNumber}</td>
                <td className="p-3 text-xs font-mono">{a.countId.slice(0, 8)}</td>
                <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${a.status === "approved" ? "bg-emerald-100 text-emerald-700" : a.status === "pending_approval" ? "bg-amber-100 text-amber-800" : "bg-slate-100"}`}>{a.status === "draft" ? "مسودة" : a.status === "pending_approval" ? "بانتظار الاعتماد" : a.status === "approved" ? "معتمدة" : "ملغية"}</span></td>
                <td className="p-3 text-xs">{new Date(a.createdAt).toLocaleDateString("ar-SA")}</td>
                <td className="p-3"><Link href={`/c/${companyId}/inventory-adjustments/${a.id}`} className="text-xs bg-[#0f2a54] text-white px-3 py-1 rounded-full">فتح</Link></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">لا توجد تسويات</td></tr>}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

export default function Page() {
  const params = useParams<{ companyId: string }>();
  return <Suspense fallback={<div className="p-10 text-center">جاري التحميل...</div>}><ListInner /></Suspense>;
}
