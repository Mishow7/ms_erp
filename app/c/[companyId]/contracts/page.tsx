"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/Shell";
import { useParams } from "next/navigation";
import Link from "next/link";

const statusLabels: Record<string, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-slate-100 text-slate-700" },
  pending_approval: { label: "بانتظار الاعتماد", cls: "bg-amber-100 text-amber-800" },
  approved: { label: "معتمد", cls: "bg-blue-100 text-blue-800" },
  in_progress: { label: "قيد التنفيذ", cls: "bg-indigo-100 text-indigo-700" },
  completed: { label: "مكتمل", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "ملغي", cls: "bg-red-100 text-red-700" },
};

export default function ContractsPage() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const [contracts, setContracts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState<any>({
    customerId: "",
    invoiceId: "",
    title: "",
    scopeOfWork: "",
    totalAmount: "",
    deliveryDate: "",
    terms: "",
    notes: "",
    status: "draft",
  });
  const [creating, setCreating] = useState(false);

  const load = () => {
    fetch(`/api/contracts?companyId=${companyId}`).then(r => r.json()).then(d => setContracts(d.contracts || []));
    fetch(`/api/customers?companyId=${companyId}`).then(r => r.json()).then(d => setCustomers(d.customers || []));
    fetch(`/api/invoices?companyId=${companyId}`).then(r => r.json()).then(d => setInvoices(d.invoices || []));
  };
  useEffect(() => { load(); }, [companyId]);

  // support prefill from query ?customerId=...&invoiceId=...
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const cId = sp.get("customerId");
    const invId = sp.get("invoiceId");
    if (cId) setForm((f: any) => ({ ...f, customerId: cId }));
    if (invId) setForm((f: any) => ({ ...f, invoiceId: invId }));
    if (cId || invId) setShow(true);
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const r = await fetch("/api/contracts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, ...form, totalAmount: parseFloat(form.totalAmount) }),
    });
    const j = await r.json();
    setCreating(false);
    if (r.ok) {
      setShow(false);
      setForm({ customerId: "", invoiceId: "", title: "", scopeOfWork: "", totalAmount: "", deliveryDate: "", terms: "", notes: "", status: "draft" });
      load();
    } else alert(j.error || "خطأ في إنشاء العقد");
  };

  const filtered = contracts.filter(c => !filter || c.contractNumber.includes(filter) || c.customerName?.includes(filter) || c.title?.includes(filter));

  return (
    <AppShell companyId={companyId}>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#0f2a54]">العقود التفصيلية</h1>
          <p className="text-xs text-slate-500">إنشاء العقود من ملف العميل أو الفاتورة • ربط تلقائي • حساب المتبقي تلقائياً</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/c/${companyId}/settings`} className="bg-white border px-4 py-2.5 rounded-xl text-sm font-medium">⚙️ تذييل العقود</Link>
          <Link href={`/c/${companyId}/contracts/new`} className="bg-[#0f2a54] text-white px-5 py-2.5 rounded-xl font-bold text-sm">+ عقد جديد</Link>
        </div>
      </div>

      <div className="mt-4 bg-white border rounded-2xl p-4">
        <div className="flex flex-wrap gap-2">
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="بحث برقم العقد أو العميل أو العنوان..." className="flex-1 min-w-[240px] border rounded-xl px-4 py-2.5 bg-slate-50" />
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {["", "draft", "approved", "in_progress", "completed"].map(s => (
              <button key={s} onClick={() => setFilter(s === "" ? "" : "")} className={`px-3 py-1.5 rounded-lg ${filter === s ? "bg-white shadow" : ""}`}>{s === "" ? "الكل" : statusLabels[s]?.label || s}</button>
            ))}
          </div>
        </div>

        <div className="overflow-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="p-3 text-right">العقد</th>
                <th className="p-3 text-right">العميل</th>
                <th className="p-3 text-right">الإجمالي</th>
                <th className="p-3 text-right">المدفوع / المتبقي</th>
                <th className="p-3 text-right">التسليم</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-t hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-mono font-bold text-[#0f2a54]">{c.contractNumber}</div>
                    <div className="text-xs font-medium">{c.title || "بدون عنوان"}</div>
                    <div className="text-[11px] text-slate-400">{new Date(c.createdAt).toLocaleDateString("ar-SA")}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold">{c.customerName}</div>
                    <div className="text-xs text-slate-500">{c.customerPhone || "—"}</div>
                    {c.invoiceId && <div className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full inline-block mt-1">مرتبط بفاتورة</div>}
                  </td>
                  <td className="p-3 font-black">{parseFloat(c.totalAmount).toLocaleString("ar-SA")} SAR</td>
                  <td className="p-3">
                    <div className="text-xs">المدفوع: <b className="text-emerald-600">{c.paidAmountComputed.toLocaleString("ar-SA")}</b></div>
                    <div className="text-xs">المتبقي: <b className="text-red-600">{c.remainingAmount.toLocaleString("ar-SA")}</b></div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1"><div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (c.paidAmountComputed / parseFloat(c.totalAmount)) * 100)}%` }}></div></div>
                  </td>
                  <td className="p-3 text-xs">{c.deliveryDate ? new Date(c.deliveryDate).toLocaleDateString("ar-SA") : "—"}</td>
                  <td className="p-3"><span className={`text-xs px-2.5 py-1 rounded-full font-bold ${statusLabels[c.status]?.cls || "bg-slate-100"}`}>{statusLabels[c.status]?.label || c.status}</span></td>
                  <td className="p-3">
                    <Link href={`/c/${companyId}/contracts/${c.id}`} className="text-xs bg-[#0f2a54] text-white px-3 py-1.5 rounded-full">عرض ومعاينة</Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400">لا توجد عقود — أنشئ عقدك الأول من هنا أو من ملف العميل/الفاتورة</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="text-[11px] text-center text-slate-400 mt-4 border-t pt-3">
          العقود تظهر ببيانات الشركة فقط — دون اسم المنصة أو عبارة الاعتماد — مع الحفاظ على الدفعات حتى عند تعديل القوالب
        </div>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto">
          <form onSubmit={create} className="bg-white rounded-2xl w-full max-w-[720px] p-6 max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h2 className="font-extrabold text-[#0f2a54]">إنشاء عقد تفصيلي</h2>
                <p className="text-xs text-slate-500">مرتبط بالعميل والفاتورة — المتبقي يحسب تلقائياً من الدفعات</p>
              </div>
              <button type="button" onClick={() => setShow(false)} className="w-8 h-8 bg-slate-100 rounded-full">✕</button>
            </div>

            <div className="grid md:grid-cols-2 gap-3 mt-4">
              <select required value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50">
                <option value="">اختر العميل *</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone || ""}</option>)}
              </select>
              <select value={form.invoiceId} onChange={e => setForm({ ...form, invoiceId: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50">
                <option value="">ربط بفاتورة (اختياري)</option>
                {invoices.map(inv => <option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {parseFloat(inv.total).toLocaleString("ar-SA")} SAR</option>)}
              </select>
              <input placeholder="عنوان العقد" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50 md:col-span-2" />
              <div className="md:col-span-2">
                <label className="text-xs font-bold">وصف المنتجات/الخدمات ونطاق العمل *</label>
                <textarea required value={form.scopeOfWork} onChange={e => setForm({ ...form, scopeOfWork: e.target.value })} rows={3} placeholder="مثال: توريد وتركيب 20 جهاز حاسب + خدمات صيانة لمدة سنة..." className="w-full mt-1 border rounded-xl p-3 bg-slate-50" />
              </div>
              <input required type="number" placeholder="إجمالي مبلغ العقد * (SAR)" value={form.totalAmount} onChange={e => setForm({ ...form, totalAmount: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input type="date" value={form.deliveryDate} onChange={e => setForm({ ...form, deliveryDate: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50">
                <option value="draft">مسودة</option>
                <option value="pending_approval">بانتظار الاعتماد</option>
                <option value="approved">معتمد</option>
                <option value="in_progress">قيد التنفيذ</option>
              </select>
              <div className="text-xs text-slate-500 flex items-center">المبلغ المتبقي سيُحسب: الإجمالي − مجموع الدفعات</div>
              <textarea placeholder="الشروط الخاصة" value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })} rows={2} className="border rounded-xl p-3 bg-slate-50 md:col-span-2" />
              <textarea placeholder="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="border rounded-xl p-3 bg-slate-50 md:col-span-2" />
            </div>

            <div className="flex gap-2 mt-6">
              <button disabled={creating} type="submit" className="flex-1 bg-[#0f2a54] text-white py-3 rounded-xl font-bold">{creating ? "جاري الحفظ..." : "حفظ العقد"}</button>
              <button type="button" onClick={() => setShow(false)} className="flex-1 border py-3 rounded-xl">إلغاء</button>
            </div>
            <div className="text-[11px] text-center text-slate-400 mt-2">سيتم تسجيل العملية في سجل التدقيق وتطبيق الصلاحيات</div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
