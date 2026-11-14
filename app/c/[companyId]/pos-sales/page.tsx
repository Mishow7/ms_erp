"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import Link from "next/link";

export default function POSSalesListPage() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const [sales, setSales] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [tab, setTab] = useState<"sales" | "returns">("sales");
  const load = () => {
    fetch(`/api/pos/sales?companyId=${companyId}`).then(r => r.json()).then(d => setSales(d.sales || []));
    fetch(`/api/pos/returns?companyId=${companyId}`).then(r => r.json()).then(d => setReturns(d.returns || []));
  };
  useEffect(() => { load(); }, [companyId]);

  return (
    <AppShell companyId={companyId}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-[#0f2a54]">مبيعات نقاط البيع والمرتجعات</h1>
        <Link href={`/c/${companyId}/pos`} className="bg-[#0f2a54] text-white px-4 py-2 rounded-xl text-sm font-bold">+ شاشة بيع جديدة</Link>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mt-4">
        <button onClick={() => setTab("sales")} className={`px-4 py-1.5 rounded-lg text-sm ${tab === "sales" ? "bg-white shadow" : ""}`}>المبيعات ({sales.length})</button>
        <button onClick={() => setTab("returns")} className={`px-4 py-1.5 rounded-lg text-sm ${tab === "returns" ? "bg-white shadow" : ""}`}>المرتجعات ({returns.length})</button>
      </div>

      <div className="bg-white border rounded-2xl p-4 mt-3">
        {tab === "sales" ? (
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-slate-600"><th className="p-3 text-right">رقم الإيصال</th><th className="p-3 text-right">العميل</th><th className="p-3 text-right">التاريخ</th><th className="p-3 text-right">الإجمالي</th><th className="p-3 text-right">المدفوع</th><th className="p-3 text-right">إجراءات</th></tr></thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-[#0f2a54]">{s.receiptNumber}</td>
                  <td className="p-3">{s.customerName}</td>
                  <td className="p-3 text-xs">{new Date(s.createdAt).toLocaleString("ar-SA")}</td>
                  <td className="p-3 font-bold">{parseFloat(s.total).toLocaleString("ar-SA")} SAR</td>
                  <td className="p-3 text-emerald-600 font-bold">{parseFloat(s.paid).toLocaleString("ar-SA")}</td>
                  <td className="p-3 flex gap-1">
                    <Link href={`/c/${companyId}/pos/receipt/${s.id}`} className="text-xs bg-white border px-2 py-1 rounded-full">إيصال</Link>
                    <Link href={`/c/${companyId}/pos/return/${s.id}`} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">إرجاع</Link>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا توجد مبيعات بعد</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-slate-600"><th className="p-3 text-right">رقم المرتجع</th><th className="p-3 text-right">الفاتورة</th><th className="p-3 text-right">المبلغ</th><th className="p-3 text-right">الطريقة</th><th className="p-3 text-right">المصير</th><th className="p-3 text-right">التاريخ</th></tr></thead>
            <tbody>
              {returns.map(r => (
                <tr key={r.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-amber-700">{r.returnNumber}</td>
                  <td className="p-3 text-xs font-mono">{r.saleId.slice(0, 8)}</td>
                  <td className="p-3 font-bold">{parseFloat(r.refundAmount).toLocaleString("ar-SA")} SAR</td>
                  <td className="p-3 text-xs">{r.refundMethod === "cash" ? "نقدي" : r.refundMethod === "card" ? "بطاقة" : r.refundMethod === "transfer" ? "تحويل" : "رصيد"}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${r.restockTo === "good" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{r.restockTo === "good" ? "إعادة للمخزون" : "تالف"}</span></td>
                  <td className="p-3 text-xs">{new Date(r.createdAt).toLocaleString("ar-SA")}</td>
                </tr>
              ))}
              {returns.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا توجد مرتجعات</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
