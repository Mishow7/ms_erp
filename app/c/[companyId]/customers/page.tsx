"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/Shell";
import { useParams } from "next/navigation";
import { printElement } from "@/lib/print";

export default function CustomersPage() {
  const params = useParams<{ companyId: string }>();
  const companyId = params.companyId;
  const [customers, setCustomers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ name: "", phone: "", email: "", city: "", taxNumber: "", address: "" });

  const load = () => fetch(`/api/customers?companyId=${companyId}&q=${q}`).then(r => r.json()).then(d => setCustomers(d.customers || [])).catch(() => {});
  useEffect(() => { load(); }, [companyId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, ...form }) });
    if (r.ok) { setShow(false); setForm({ name: "", phone: "", email: "", city: "", taxNumber: "", address: "" }); load(); } else alert("خطأ");
  };

  const exportCsv = () => {
    const rows = [["الاسم","الهاتف","البريد","المدينة","الرقم الضريبي"], ...customers.map(c => [c.name, c.phone||"", c.email||"", c.city||"", c.taxNumber||""])];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `customers-${companyId}.csv`; a.click();
  };

  return (
    <AppShell companyId={companyId}>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#0f2a54]">العملاء</h1>
          <p className="text-xs text-slate-500">إدارة العملاء — معزولة لكل شركة • MS للأعمال البرمجية</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="bg-white border px-4 py-2 rounded-xl text-sm font-medium">تصدير CSV</button>
          <button onClick={() => setShow(true)} className="bg-[#0f2a54] text-white px-5 py-2 rounded-xl font-bold text-sm">+ عميل جديد</button>
        </div>
      </div>

      <div className="mt-4 bg-white border rounded-2xl p-4">
        <div className="flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث بالاسم..." className="flex-1 border rounded-xl px-4 py-2.5 bg-slate-50" />
          <button onClick={load} className="bg-slate-900 text-white px-5 rounded-xl text-sm">بحث</button>
          <button onClick={() => printElement("print-customers-table", { title: "تقرير العملاء", paper: "A4" })} className="no-print bg-white border px-4 rounded-xl text-sm">طباعة</button>
        </div>

        <div className="overflow-auto mt-4 print-area" id="print-customers-table">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="p-3 text-right">العميل</th>
                <th className="p-3 text-right">التواصل</th>
                <th className="p-3 text-right">المدينة</th>
                <th className="p-3 text-right">الرصيد</th>
                <th className="p-3 text-right">تاريخ الإضافة</th>
                <th className="p-3 text-right">العقود</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-t hover:bg-slate-50">
                  <td className="p-3"><div className="font-bold">{c.name}</div><div className="text-xs text-slate-500">{c.taxNumber || "بدون رقم ضريبي"}</div></td>
                  <td className="p-3"><div>{c.phone || "—"}</div><div className="text-xs text-slate-500">{c.email || "—"}</div></td>
                  <td className="p-3">{c.city || "—"}</td>
                  <td className="p-3 font-bold">{parseFloat(c.balance || "0").toLocaleString("ar-SA")} SAR</td>
                  <td className="p-3 text-xs text-slate-500">{new Date(c.createdAt).toLocaleDateString("ar-SA")}</td>
                  <td className="p-3"><a href={`/c/${companyId}/contracts/new?customerId=${c.id}`} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-full font-bold hover:bg-indigo-700">📄 عقد جديد</a></td>
                </tr>
              ))}
              {customers.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا يوجد عملاء — أضف أول عميل</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="text-[11px] text-center text-slate-400 mt-3 border-t pt-3">تذييل التقرير: MS للأعمال البرمجية — إعداد وتنفيذ المهندس محمد ماجد العليمي</div>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={create} className="bg-white rounded-2xl w-full max-w-[520px] p-6">
            <h2 className="font-bold text-[#0f2a54]">إضافة عميل</h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <input required placeholder="اسم العميل *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="col-span-2 border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input placeholder="الهاتف" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input placeholder="البريد" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input placeholder="المدينة" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input placeholder="الرقم الضريبي" value={form.taxNumber} onChange={e => setForm({ ...form, taxNumber: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input placeholder="العنوان" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="col-span-2 border rounded-xl px-3 py-2.5 bg-slate-50" />
            </div>
            <div className="flex gap-2 mt-6">
              <button type="submit" className="flex-1 bg-[#0f2a54] text-white py-2.5 rounded-xl font-bold">حفظ</button>
              <button type="button" onClick={() => setShow(false)} className="flex-1 border py-2.5 rounded-xl">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
