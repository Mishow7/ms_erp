"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/Shell";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function CompanyDashboard() {
  const params = useParams<{ companyId: string }>();
  const companyId = params.companyId;
  const [data, setData] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/dashboard?companyId=${companyId}`).then(r => r.json()).then(setData);
    fetch(`/api/companies`).then(r => r.json()).then(d => {
      if (d.companies) setCompany(d.companies.find((c: any) => c.id === companyId));
    });
  }, [companyId]);

  if (!data) return <AppShell companyId={companyId}><div className="p-10 text-center">جاري التحميل...</div></AppShell>;

  if (data.error) return <AppShell companyId={companyId}><div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl mt-6">غير مصرح لك بالوصول لهذه الشركة. بيانات الشركات معزولة تمامًا.</div></AppShell>;

  return (
    <AppShell companyId={companyId}>
      <div className="bg-gradient-to-r from-[#0f2a54] to-[#1d4ed8] text-white rounded-2xl p-6">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold">{company?.name || "لوحة الشركة"}</h1>
            <p className="text-sm text-white/80">نظرة عامة تشغيلية • العملة {company?.currency || "SAR"} • الباقة {company?.plan || "—"}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/c/${companyId}/invoices`} className="bg-white text-[#0f2a54] px-4 py-2 rounded-xl text-sm font-bold">إنشاء فاتورة</Link>
            <Link href={`/c/${companyId}/customers`} className="bg-white/15 border border-white/20 px-4 py-2 rounded-xl text-sm">عميل جديد</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="bg-white border rounded-2xl p-4">
          <div className="text-xs text-slate-500">إجمالي المبيعات</div>
          <div className="text-xl font-black text-emerald-600">{data.stats.totalSales.toLocaleString("ar-SA")} SAR</div>
          <div className="text-xs text-slate-400 mt-1">شامل الضريبة</div>
        </div>
        <div className="bg-white border rounded-2xl p-4">
          <div className="text-xs text-slate-500">إجمالي المشتريات</div>
          <div className="text-xl font-black text-amber-600">{data.stats.totalPurchases.toLocaleString("ar-SA")} SAR</div>
        </div>
        <div className="bg-white border rounded-2xl p-4">
          <div className="text-xs text-slate-500">العملاء</div>
          <div className="text-xl font-black">{data.stats.customers}</div>
          <div className="text-xs text-slate-400">منتجات: {data.stats.products} • نقص مخزون: {data.stats.lowStock}</div>
        </div>
        <div className="bg-white border rounded-2xl p-4">
          <div className="text-xs text-slate-500">فواتير معلقة</div>
          <div className="text-xl font-black text-red-600">{data.stats.pendingInvoices}</div>
          <div className="text-xs text-slate-400">تحتاج متابعة</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white border rounded-2xl p-5">
          <div className="font-bold">المبيعات الشهرية</div>
          <div className="mt-4 flex items-end gap-2 h-[120px]">
            {data.monthlySales?.map((m: any) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-gradient-to-t from-[#0f2a54] to-blue-500 rounded-t-lg" style={{ height: `${Math.max(10, (m.value / Math.max(...data.monthlySales.map((x: any) => x.value)) ) * 100)}px` }}></div>
                <div className="text-[11px] text-slate-500">{m.month}</div>
                <div className="text-[11px] font-bold">{m.value.toLocaleString("ar-SA")}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border rounded-2xl p-5">
          <div className="font-bold">أحدث الفواتير</div>
          <div className="mt-3 space-y-2">
            {data.recentInvoices?.map((inv: any) => (
              <div key={inv.id} className="flex justify-between items-center p-3 border rounded-xl bg-slate-50">
                <div>
                  <div className="text-sm font-bold">{inv.invoiceNumber}</div>
                  <div className="text-xs text-slate-500">{new Date(inv.createdAt).toLocaleDateString("ar-SA")} • {inv.status}</div>
                </div>
                <div className="font-black text-[#0f2a54]">{parseFloat(inv.total).toLocaleString("ar-SA")} SAR</div>
              </div>
            ))}
            {(!data.recentInvoices || data.recentInvoices.length === 0) && <div className="text-sm text-slate-400 text-center py-6">لا توجد فواتير بعد</div>}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {[
          { title: "المبيعات والعملاء", href: `/c/${companyId}/customers`, icon: "👥", desc: "إدارة العملاء والفواتير والتحصيلات" },
          { title: "المخزون والمنتجات", href: `/c/${companyId}/products`, icon: "📦", desc: "أرصدة وتنبيهات وحركة الأصناف" },
          { title: "المهام والموافقات", href: `/c/${companyId}/tasks`, icon: "✅", desc: "مسارات اعتماد وإشعارات" },
        ].map(card => (
          <Link key={card.href} href={card.href} className="bg-white border rounded-2xl p-5 hover:shadow-md transition">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">{card.icon}</div>
            <div className="font-bold mt-3">{card.title}</div>
            <div className="text-xs text-slate-500 mt-1">{card.desc}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 bg-white border rounded-2xl p-4 text-center text-xs text-slate-400">
        ترويسة المطبوعات: <b className="text-[#0f2a54]">MS للأعمال البرمجية</b> — إعداد وتنفيذ المهندس محمد ماجد العليمي — تظهر في كل تصدير PDF
      </div>
    </AppShell>
  );
}
