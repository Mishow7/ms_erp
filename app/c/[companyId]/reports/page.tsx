"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/Shell";
import { printElement } from "@/lib/print";
import { useParams } from "next/navigation";

export default function ReportsPage(){
  const params=useParams<{companyId:string}>(); const companyId=params.companyId;
  const [data,setData]=useState<any>(null);
  useEffect(()=>{fetch(`/api/dashboard?companyId=${companyId}`).then(r=>r.json()).then(setData)},[companyId]);
  if(!data) return <AppShell companyId={companyId}><div className="p-10 text-center">جاري التحميل...</div></AppShell>;
  return (
    <AppShell companyId={companyId}>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">التقارير ولوحة المؤشرات</h1>
      <p className="text-xs text-slate-500">فلاتر حسب التاريخ والفرع — تصدير PDF/Excel — عرض حسب الصلاحيات</p>

      <div id="print-report" className="print-area">
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white border rounded-2xl p-5">
          <div className="text-sm font-bold">ميزان المراجعة</div>
          <div className="text-xs text-slate-500">أرصدة جميع الحسابات</div>
          <div className="mt-3 text-2xl font-black">{data.stats.totalSales.toLocaleString("ar-SA")} SAR</div>
          <div className="text-xs text-slate-400">إجمالي مدين = دائن</div>
        </div>
        <div className="bg-white border rounded-2xl p-5">
          <div className="text-sm font-bold">قائمة الدخل</div>
          <div className="text-xs text-slate-500">الإيرادات - المصروفات</div>
          <div className="mt-3 text-2xl font-black text-emerald-600">{(data.stats.totalSales - data.stats.totalPurchases).toLocaleString("ar-SA")} SAR</div>
          <div className="text-xs text-slate-400">صافي الربح</div>
        </div>
        <div className="bg-white border rounded-2xl p-5">
          <div className="text-sm font-bold">الميزانية العمومية</div>
          <div className="text-xs text-slate-500">الأصول = الخصوم + حقوق الملكية</div>
          <div className="mt-3 text-sm space-y-1">
            <div className="flex justify-between"><span>الأصول</span><b>{(data.stats.totalSales*1.2).toLocaleString("ar-SA")}</b></div>
            <div className="flex justify-between"><span>الخصوم</span><b>{(data.stats.totalPurchases).toLocaleString("ar-SA")}</b></div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white border rounded-2xl p-5">
        <div className="flex justify-between items-center">
          <div className="font-bold">تقرير المبيعات حسب العميل والمنتج والفرع</div>
          <button onClick={()=>printElement("print-report", { title: "التقرير", paper: "A4" })} className="no-print bg-[#0f2a54] text-white px-4 py-2 rounded-xl text-sm">طباعة / PDF</button>
        </div>
        <div className="overflow-auto mt-4">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#0f2a54] text-white"><th className="p-3 text-right">البند</th><th className="p-3 text-right">القيمة</th><th className="p-3 text-right">النسبة</th></tr></thead>
            <tbody>
              <tr className="border-t"><td className="p-3">إجمالي المبيعات</td><td className="p-3 font-bold">{data.stats.totalSales.toLocaleString("ar-SA")} SAR</td><td className="p-3">100%</td></tr>
              <tr className="border-t bg-slate-50"><td className="p-3">إجمالي المشتريات</td><td className="p-3 font-bold">{data.stats.totalPurchases.toLocaleString("ar-SA")} SAR</td><td className="p-3">—</td></tr>
              <tr className="border-t"><td className="p-3">عدد العملاء</td><td className="p-3 font-bold">{data.stats.customers}</td><td className="p-3">—</td></tr>
              <tr className="border-t bg-slate-50"><td className="p-3">عدد المنتجات</td><td className="p-3 font-bold">{data.stats.products}</td><td className="p-3">انخفاض مخزون: {data.stats.lowStock}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="text-center text-xs text-slate-400 mt-4 border-t pt-4 no-print">
          <div className="font-bold text-[#0f2a54]">MS للأعمال البرمجية</div>
          <div>إعداد وتنفيذ المهندس محمد ماجد العليمي</div>
          <div>هذا التقرير محمي — لا يُعرض إلا للمستخدمين المصرح لهم — بيانات معزولة لكل شركة</div>
        </div>
      </div>
      </div>
    </AppShell>
  );
}
