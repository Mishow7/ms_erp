"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/Shell";

export default function StaleStockReport() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState(90);

  const load = () => fetch(`/api/reports/stock?companyId=${companyId}&days=${days}`).then(r => r.json()).then(setData);
  useEffect(() => { load(); }, [companyId, days]);

  return (
    <AppShell companyId={companyId}>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">تقرير المخزون الراكد</h1>
      <p className="text-xs text-slate-500">أصناف لها حركات سابقة لكنها لم تتحرك منذ المدة المختارة</p>
      <div className="flex items-center gap-2 bg-white border rounded-2xl p-3 mt-3">
        <span className="text-xs">مدة الركود:</span>
        {[30, 60, 90, 180].map(d => (
          <button key={d} onClick={() => setDays(d)} className={`px-3 py-1 rounded-lg text-sm ${days === d ? "bg-[#0f2a54] text-white" : "bg-slate-100"}`}>{d} يوم</button>
        ))}
      </div>
      {data && (
        <>
          <div className="bg-white border rounded-2xl p-4 mt-3">
            <div className="text-sm">إجمالي عدد الأصناف الراكدة: <b>{data.staleStock.length}</b></div>
            <div className="text-sm">قيمة المخزون الراكد: <b className="text-red-600">{data.totalValue.toLocaleString("ar-SA")} SAR</b></div>
          </div>
          <div className="bg-white border rounded-2xl p-4 mt-3">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-slate-600"><th className="p-3 text-right">المنتج</th><th className="p-3 text-right">SKU</th><th className="p-3 text-right">الفئة</th><th className="p-3 text-right">الكمية</th><th className="p-3 text-right">آخر حركة</th><th className="p-3 text-right">مدة الركود</th><th className="p-3 text-right">القيمة</th></tr></thead>
              <tbody>
                {data.staleStock.map((s: any) => (
                  <tr key={s.productId} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-bold">{s.productName}</td>
                    <td className="p-3 text-xs font-mono">{s.sku || "—"}</td>
                    <td className="p-3 text-xs">{s.category || "—"}</td>
                    <td className="p-3 font-bold">{s.currentStock}</td>
                    <td className="p-3 text-xs">{new Date(s.lastMovement).toLocaleDateString("ar-SA")}</td>
                    <td className="p-3 text-red-600 font-bold">{s.daysSinceLastMovement} يوم</td>
                    <td className="p-3 font-bold">{s.costValue.toLocaleString("ar-SA")} SAR</td>
                  </tr>
                ))}
                {data.staleStock.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400">لا توجد أصناف راكدة في هذه المدة</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
