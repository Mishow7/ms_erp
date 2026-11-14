"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { printElement } from "@/lib/print";
import { AppShell } from "@/components/Shell";

export default function SalesAnalyticsReport() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const [data, setData] = useState<any>(null);
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [view, setView] = useState<"hour" | "day">("hour");

  const load = () => {
    fetch(`/api/reports/sales-analytics?companyId=${companyId}&from=${from}&to=${to}`).then(r => r.json()).then(setData);
  };
  useEffect(() => { load(); }, [companyId, from, to]);

  return (
    <AppShell companyId={companyId}>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">تقارير المبيعات والتحليلات</h1>
      <p className="text-xs text-slate-500">بيانات فعلية من سجل المبيعات — لا توجد تقديرات</p>

      <div className="flex flex-wrap gap-2 bg-white border rounded-2xl p-3 mt-3">
        <div><label className="text-xs">من</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="block border rounded-lg px-2 py-1 text-sm" /></div>
        <div><label className="text-xs">إلى</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className="block border rounded-lg px-2 py-1 text-sm" /></div>
        <button onClick={load} className="self-end bg-[#0f2a54] text-white px-4 py-1.5 rounded-lg text-sm">تحديث</button>
      </div>

      {data && (
        <div id="print-sales-report" className="print-area">
          <div className="hidden print:block mb-3 pb-2 border-b-2 border-[#0f2a54]">
            <div className="font-extrabold text-lg">تقرير المبيعات وتحليلات نقاط البيع</div>
            <div className="text-xs">الفترة: {from} — {to}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">إجمالي المبيعات</div><div className="text-lg font-black text-emerald-600">{data.totalSales.toLocaleString("ar-SA")} SAR</div></div>
            <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">إجمالي المرتجعات</div><div className="text-lg font-black text-red-600">{data.totalReturns.toLocaleString("ar-SA")} SAR</div></div>
            <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">صافي المبيعات</div><div className="text-lg font-black text-[#0f2a54]">{data.netSales.toLocaleString("ar-SA")} SAR</div></div>
            <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">عدد العمليات</div><div className="text-lg font-black">{data.salesCount} بيع / {data.returnsCount} إرجاع</div></div>
          </div>

          <div className="bg-white border rounded-2xl p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold">1. تقرير أوقات الذروة</div>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                <button onClick={() => setView("hour")} className={`px-3 py-1 rounded ${view === "hour" ? "bg-white shadow" : ""}`}>بالساعة</button>
                <button onClick={() => setView("day")} className={`px-3 py-1 rounded ${view === "day" ? "bg-white shadow" : ""}`}>باليوم</button>
              </div>
            </div>
            <div className="flex items-end gap-1 h-[160px] overflow-x-auto">
              {(view === "hour" ? data.peakHours : data.peakDays).map((b: any) => {
                const max = Math.max(...(view === "hour" ? data.peakHours : data.peakDays).map((x: any) => x.total), 1);
                const h = (b.total / max) * 140;
                return (
                  <div key={b.hour || b.date} className="flex flex-col items-center justify-end min-w-[24px]">
                    <div className="text-[10px] font-bold">{b.count}</div>
                    <div className="bg-gradient-to-t from-[#0f2a54] to-blue-500 w-full rounded-t" style={{ height: `${Math.max(2, h)}px` }}></div>
                    <div className="text-[9px] text-slate-500 mt-1">{b.hour || b.date?.slice(5)}</div>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-slate-500 mt-2">البيانات من سجل المبيعات الفعلي للفترة المختارة</div>
          </div>

          <div className="bg-white border rounded-2xl p-4 mt-4">
            <div className="font-bold">2. تنبيهات المخزون</div>
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <div className="text-sm font-bold text-red-700">منتجات وصلت حد إعادة الطلب: {data.lowStockCount}</div>
                <div className="text-xs text-slate-500 mt-1">قائمة المنتجات منخفضة المخزون</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="text-sm font-bold text-amber-700">قيمة المخزون الحالية</div>
                <div className="text-lg font-black">{data.stockValue.toLocaleString("ar-SA")} SAR</div>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-4 mt-4">
            <div className="font-bold">3. روابط سريعة للتقارير الفرعية</div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
              <a href={`/c/${companyId}/reports-stock`} className="border rounded-xl p-3 hover:bg-slate-50"><div className="font-bold text-sm">📦 المخزون الراكد</div><div className="text-xs text-slate-500">أصناف لم تتحرك منذ 30/60/90 يوم</div></a>
              <a href={`/c/${companyId}/pos-sales`} className="border rounded-xl p-3 hover:bg-slate-50"><div className="font-bold text-sm">🧾 مبيعات ومرتجعات</div><div className="text-xs text-slate-500">سجل تفصيلي بالمستندات</div></a>
              <a href={`/c/${companyId}/inventory-counts`} className="border rounded-xl p-3 hover:bg-slate-50"><div className="font-bold text-sm">📋 الجرد والتسويات</div><div className="text-xs text-slate-500">نقاط جردية وتسويات معتمدة</div></a>
              <button onClick={() => printElement("print-sales-report", { title: "تقرير المبيعات", paper: "A4" })} className="border rounded-xl p-3 hover:bg-slate-50 text-right no-print"><div className="font-bold text-sm">🖨️ تصدير</div><div className="text-xs text-slate-500">طباعة أو PDF</div></button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
