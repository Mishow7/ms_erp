"use client";
import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import Link from "next/link";
import { printElement } from "@/lib/print";

const tabs = [
  { key: "register", label: "كشف الصناديق", icon: "💰" },
  { key: "bank", label: "كشف البنوك", icon: "🏦" },
  { key: "customer", label: "كشف العملاء", icon: "👥" },
  { key: "supplier", label: "كشف الموردين", icon: "🚚" },
  { key: "inventory", label: "حركة المخزون", icon: "📦" },
  { key: "stock-balances", label: "أرصدة المخزون", icon: "📊" },
];

function StatementsInner() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const sp = useSearchParams();
  const [tab, setTab] = useState<string>(sp?.get("tab") || "register");
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [registerId, setRegisterId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");

  const [registers, setRegisters] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/pos/setup?companyId=${companyId}`).then(r=>r.json()).then(d => { setRegisters(d.registers||[]); setCustomers(d.customers||[]); setProducts(d.products||[]); });
    fetch(`/api/suppliers?companyId=${companyId}`).then(r=>r.json()).then(d => setSuppliers(d.suppliers||[]));
  }, [companyId]);

  const load = async () => {
    setLoading(true); setData(null);
    let url = "";
    const params = new URLSearchParams({ companyId, from, to });
    if (tab === "register") { url = `/api/reports/register-statement?${params.toString()}${registerId ? `&registerId=${registerId}` : ""}`; }
    else if (tab === "customer") { url = `/api/reports/customer-statement?${params.toString()}${customerId ? `&customerId=${customerId}` : ""}`; }
    else if (tab === "supplier") { url = `/api/reports/supplier-statement?${params.toString()}${supplierId ? `&supplierId=${supplierId}` : ""}`; }
    else if (tab === "inventory") { url = `/api/reports/inventory-movements?${params.toString()}${productId ? `&productId=${productId}` : ""}`; }
    else if (tab === "stock-balances") { url = `/api/products?companyId=${companyId}`; }
    else { setLoading(false); return; }
    const r = await fetch(url);
    const j = await r.json();
    setData(j);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const exportCsv = () => {
    if (!data) return;
    let rows: string[][] = [];
    let title = "";
    if (tab === "register") {
      title = "كشف حساب الصناديق";
      data.statements?.forEach((s: any) => {
        rows.push([`الصندوق: ${s.register.name}`, "", "", "", ""]);
        rows.push(["التاريخ","المستند","البيان","مدين","دائن","الرصيد"]);
        s.lines.forEach((l: any) => rows.push([new Date(l.date).toLocaleString("ar-SA"), l.doc, l.desc, l.debit.toString(), l.credit.toString(), l.balance.toString()]));
        rows.push(["", "", "الرصيد الختامي", "", "", s.closing.toString()]);
        rows.push([]);
      });
    } else if (tab === "customer") {
      title = "كشف حساب العملاء";
      data.statements?.forEach((s: any) => {
        rows.push([`العميل: ${s.customer.name}`, "", "", "", ""]);
        rows.push(["التاريخ","المستند","البيان","مدين","دائن","الرصيد"]);
        s.lines.forEach((l: any) => rows.push([new Date(l.date).toLocaleString("ar-SA"), l.doc, l.desc, l.debit.toString(), l.credit.toString(), l.balance.toString()]));
        rows.push(["","","الرصيد الختامي","","",s.closing.toString()]);
        rows.push([]);
      });
    } else if (tab === "supplier") {
      title = "كشف حساب الموردين";
      data.statements?.forEach((s: any) => {
        rows.push([`المورد: ${s.supplier.name}`, "", "", "", ""]);
        rows.push(["التاريخ","المستند","البيان","مدين","دائن","الرصيد"]);
        s.lines.forEach((l: any) => rows.push([new Date(l.date).toLocaleString("ar-SA"), l.doc, l.desc, l.debit.toString(), l.credit.toString(), l.balance.toString()]));
        rows.push([]);
      });
    } else if (tab === "inventory") {
      title = "حركة المخزون";
      data.cards?.forEach((c: any) => {
        rows.push([`الصنف: ${c.product.name}`, "", "", "", ""]);
        rows.push(["التاريخ","المستند","البيان","داخل","خارج","الرصيد"]);
        c.lines.forEach((l: any) => rows.push([new Date(l.date).toLocaleString("ar-SA"), l.doc, l.desc, l.in.toString(), l.out.toString(), l.balance.toString()]));
        rows.push([]);
      });
    }
    if (rows.length === 0) return alert("لا بيانات للتصدير");
    const csv = "\ufeff" + rows.map(r => r.map(c => `"${c.replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${title}.csv`; a.click();
  };

  return (
    <AppShell companyId={companyId}>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">الكشوفات والتقارير</h1>
      <p className="text-xs text-slate-500">كشوفات مالية ومخزنية معتمدة على الحركات الفعلية — مع عزل كامل بين الشركات</p>

      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl w-fit mt-3">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t.key ? "bg-white shadow" : ""}`}>
            <span className="ml-1">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-2xl p-4 mt-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div><label className="text-[10px]">من</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="block border rounded-lg px-2 py-1 text-sm" /></div>
          <div><label className="text-[10px]">إلى</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="block border rounded-lg px-2 py-1 text-sm" /></div>
          {tab === "register" && <div><label className="text-[10px]">الصندوق</label><select value={registerId} onChange={e=>setRegisterId(e.target.value)} className="block border rounded-lg px-2 py-1 text-sm"><option value="">كل الصناديق</option>{registers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>}
          {tab === "customer" && <div><label className="text-[10px]">العميل</label><select value={customerId} onChange={e=>setCustomerId(e.target.value)} className="block border rounded-lg px-2 py-1 text-sm"><option value="">كل العملاء</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
          {tab === "supplier" && <div><label className="text-[10px]">المورد</label><select value={supplierId} onChange={e=>setSupplierId(e.target.value)} className="block border rounded-lg px-2 py-1 text-sm"><option value="">كل الموردين</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
          {tab === "inventory" && <div><label className="text-[10px]">الصنف</label><select value={productId} onChange={e=>setProductId(e.target.value)} className="block border rounded-lg px-2 py-1 text-sm"><option value="">كل الأصناف</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>}
          <button onClick={load} className="bg-[#0f2a54] text-white px-4 py-1.5 rounded-lg text-sm">تحديث</button>
          <button onClick={exportCsv} className="bg-white border px-4 py-1.5 rounded-lg text-sm">📥 تصدير CSV</button>
          <button onClick={() => printElement("print-statements", { title: "الكشف", paper: "A4", orientation: "landscape" })} className="bg-white border px-4 py-1.5 rounded-lg text-sm no-print">🖨️ طباعة/PDF</button>
        </div>
      </div>

      <div id="print-statements" className="print-area mt-3">
        <div className="hidden print:block mb-3 pb-2 border-b-2 border-[#0f2a54]">
          <div className="font-extrabold text-lg">الكشوفات والتقارير</div>
          <div className="text-xs">الفترة: {new Date(data?.from || Date.now()).toLocaleDateString("ar-SA")} — {new Date(data?.to || Date.now()).toLocaleDateString("ar-SA")}</div>
        </div>
        {loading && <div className="p-10 text-center text-slate-500">جاري التحميل...</div>}
        {!loading && data && tab === "register" && data.statements?.map((s: any, i: number) => (
          <div key={i} className="bg-white border rounded-2xl p-5 mb-4">
            <div className="flex justify-between border-b pb-2 mb-2">
              <div className="font-bold text-[#0f2a54]">كشف حساب الصندوق: {s.register.name}</div>
              <div className="text-xs text-slate-500">الفترة: {new Date(data.from).toLocaleDateString("ar-SA")} — {new Date(data.to).toLocaleDateString("ar-SA")}</div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-100 text-xs"><th className="p-2 text-right">التاريخ</th><th className="p-2 text-right">المستند</th><th className="p-2 text-right">البيان</th><th className="p-2 text-right">مدين</th><th className="p-2 text-right">دائن</th><th className="p-2 text-right">الرصيد</th></tr></thead>
              <tbody>
                {s.lines.map((l: any, j: number) => (
                  <tr key={j} className="border-t">
                    <td className="p-2 text-xs">{new Date(l.date).toLocaleString("ar-SA")}</td>
                    <td className="p-2 text-xs font-mono">{l.doc}</td>
                    <td className="p-2 text-xs">{l.desc}</td>
                    <td className="p-2 text-xs text-emerald-600">{l.debit > 0 ? l.debit.toLocaleString("ar-SA") : ""}</td>
                    <td className="p-2 text-xs text-red-600">{l.credit > 0 ? l.credit.toLocaleString("ar-SA") : ""}</td>
                    <td className="p-2 text-xs font-bold">{l.balance.toLocaleString("ar-SA")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-slate-100 font-bold border-t-2"><td colSpan={5} className="p-2">الرصيد الختامي</td><td className="p-2 text-[#0f2a54]">{s.closing.toLocaleString("ar-SA")} SAR</td></tr></tfoot>
            </table>
            <div className="text-xs text-slate-500 mt-2">إجمالي المبيعات: {s.totals.sales.toLocaleString("ar-SA")} | المرتجعات: {s.totals.returns.toLocaleString("ar-SA")} | إيداعات: {s.totals.deposits.toLocaleString("ar-SA")} | سحوبات: {s.totals.withdrawals.toLocaleString("ar-SA")}</div>
          </div>
        ))}

        {!loading && data && tab === "customer" && data.statements?.map((s: any, i: number) => (
          <div key={i} className="bg-white border rounded-2xl p-5 mb-4">
            <div className="flex justify-between border-b pb-2 mb-2">
              <div className="font-bold text-[#0f2a54]">كشف حساب العميل: {s.customer.name}</div>
              <div className="text-xs">{s.customer.phone || ""}</div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-100 text-xs"><th className="p-2 text-right">التاريخ</th><th className="p-2 text-right">المستند</th><th className="p-2 text-right">البيان</th><th className="p-2 text-right">مدين</th><th className="p-2 text-right">دائن</th><th className="p-2 text-right">الرصيد</th></tr></thead>
              <tbody>
                {s.lines.map((l: any, j: number) => (
                  <tr key={j} className="border-t">
                    <td className="p-2 text-xs">{new Date(l.date).toLocaleString("ar-SA")}</td>
                    <td className="p-2 text-xs font-mono">{l.doc}</td>
                    <td className="p-2 text-xs">{l.desc}</td>
                    <td className="p-2 text-xs text-emerald-600">{l.debit > 0 ? l.debit.toLocaleString("ar-SA") : ""}</td>
                    <td className="p-2 text-xs text-red-600">{l.credit > 0 ? l.credit.toLocaleString("ar-SA") : ""}</td>
                    <td className="p-2 text-xs font-bold">{l.balance.toLocaleString("ar-SA")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-slate-100 font-bold border-t-2"><td colSpan={5} className="p-2">الرصيد المستحق</td><td className="p-2 text-red-600">{s.closing.toLocaleString("ar-SA")} SAR</td></tr></tfoot>
            </table>
            <div className="text-xs text-slate-500 mt-2">مفوتر: {s.totals.invoiced.toLocaleString("ar-SA")} | محصل: {s.totals.collected.toLocaleString("ar-SA")} | مرتجعات: {s.totals.returns.toLocaleString("ar-SA")} | إشعارات دائنة: {s.totals.creditNotes.toLocaleString("ar-SA")}</div>
          </div>
        ))}

        {!loading && data && tab === "supplier" && data.statements?.map((s: any, i: number) => (
          <div key={i} className="bg-white border rounded-2xl p-5 mb-4">
            <div className="flex justify-between border-b pb-2 mb-2">
              <div className="font-bold text-[#0f2a54]">كشف حساب المورد: {s.supplier.name}</div>
              <div className="text-xs">{s.supplier.phone || ""}</div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-100 text-xs"><th className="p-2 text-right">التاريخ</th><th className="p-2 text-right">المستند</th><th className="p-2 text-right">البيان</th><th className="p-2 text-right">مدين</th><th className="p-2 text-right">دائن</th><th className="p-2 text-right">الرصيد</th></tr></thead>
              <tbody>{s.lines.map((l: any, j: number) => (
                <tr key={j} className="border-t"><td className="p-2 text-xs">{new Date(l.date).toLocaleString("ar-SA")}</td><td className="p-2 text-xs font-mono">{l.doc}</td><td className="p-2 text-xs">{l.desc}</td><td className="p-2 text-xs text-emerald-600">{l.debit > 0 ? l.debit.toLocaleString("ar-SA") : ""}</td><td className="p-2 text-xs text-red-600">{l.credit > 0 ? l.credit.toLocaleString("ar-SA") : ""}</td><td className="p-2 text-xs font-bold">{l.balance.toLocaleString("ar-SA")}</td></tr>
              ))}</tbody>
              <tfoot><tr className="bg-slate-100 font-bold border-t-2"><td colSpan={5} className="p-2">الرصيد المستحق للمورد</td><td className="p-2 text-[#0f2a54]">{s.closing.toLocaleString("ar-SA")} SAR</td></tr></tfoot>
            </table>
          </div>
        ))}

        {!loading && data && tab === "inventory" && data.cards?.map((c: any, i: number) => (
          <div key={i} className="bg-white border rounded-2xl p-5 mb-4">
            <div className="flex justify-between border-b pb-2 mb-2">
              <div className="font-bold text-[#0f2a54]">بطاقة حركة الصنف: {c.product.name}</div>
              <div className="text-xs">SKU: {c.product.sku || "—"} • المخزون الحالي: <b>{c.currentStock}</b> • القيمة: {c.currentValue.toLocaleString("ar-SA")} SAR</div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-100 text-xs"><th className="p-2 text-right">التاريخ</th><th className="p-2 text-right">المستند</th><th className="p-2 text-right">البيان</th><th className="p-2 text-right">داخل</th><th className="p-2 text-right">خارج</th><th className="p-2 text-right">الرصيد</th></tr></thead>
              <tbody>{c.lines.map((l: any, j: number) => (
                <tr key={j} className="border-t"><td className="p-2 text-xs">{new Date(l.date).toLocaleString("ar-SA")}</td><td className="p-2 text-xs font-mono">{l.doc}</td><td className="p-2 text-xs">{l.desc}</td><td className="p-2 text-xs text-emerald-600">{l.in > 0 ? l.in : ""}</td><td className="p-2 text-xs text-red-600">{l.out > 0 ? l.out : ""}</td><td className="p-2 text-xs font-bold">{l.balance}</td></tr>
              ))}</tbody>
              <tfoot><tr className="bg-slate-100 font-bold border-t-2"><td colSpan={5} className="p-2">الرصيد الختامي</td><td className="p-2">{c.closing}</td></tr></tfoot>
            </table>
          </div>
        ))}

        {!loading && tab === "stock-balances" && (
          <div className="bg-white border rounded-2xl p-4">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50"><th className="p-2 text-right">الصنف</th><th className="p-2 text-right">SKU</th><th className="p-2 text-right">الفئة</th><th className="p-2 text-right">الكمية</th><th className="p-2 text-right">التكلفة</th><th className="p-2 text-right">القيمة</th></tr></thead>
              <tbody>{(data?.products || products).map((p: any) => (
                <tr key={p.id} className="border-t"><td className="p-2 font-bold">{p.name}</td><td className="p-2 font-mono text-xs">{p.sku || "—"}</td><td className="p-2 text-xs">{p.category || "—"}</td><td className="p-2">{p.stock}</td><td className="p-2 text-xs">{parseFloat(p.cost||"0").toFixed(2)}</td><td className="p-2 font-bold">{(p.stock * parseFloat(p.cost||"0")).toLocaleString("ar-SA")}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-[11px] text-center text-slate-400 mt-6 border-t pt-3 no-print">MS للأعمال البرمجية — إعداد وتنفيذ المهندس محمد ماجد العليمي — لا يظهر في النسخة المطبوعة</div>
      <style jsx global>{`@media print { .no-print { display: none !important; } }`}</style>
    </AppShell>
  );
}

export default function StatementsPage() {
  const params = useParams<{ companyId: string }>();
  return <Suspense fallback={<div className="p-10 text-center">جاري التحميل...</div>}><StatementsInner /></Suspense>;
}
