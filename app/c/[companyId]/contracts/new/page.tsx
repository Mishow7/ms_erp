"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import Link from "next/link";

const statusOptions = [
  { v: "draft", l: "مسودة" },
  { v: "pending_approval", l: "بانتظار الاعتماد" },
  { v: "approved", l: "معتمد" },
  { v: "in_progress", l: "قيد التنفيذ" },
];

interface NewContractForm {
  customerId: string;
  invoiceId: string;
  title: string;
  scopeOfWork: string;
  totalAmount: string;
  deliveryDate: string;
  terms: string;
  notes: string;
  status: string;
}

function NewContractInner() {
  const params = useParams<{ companyId: string }>();
  const companyId = params?.companyId || "";
  const searchParams = useSearchParams();
  const router = useRouter();

  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);
  const submitLockRef = useRef(false);

  const [form, setForm] = useState<NewContractForm>({
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

  // 1) load data
  useEffect(() => {
    if (!companyId) return;
    let aborted = false;
    setLoadingData(true);
    setError("");
    (async () => {
      try {
        const [cRes, iRes] = await Promise.all([
          fetch(`/api/customers?companyId=${encodeURIComponent(companyId)}`, { credentials: "include" }),
          fetch(`/api/invoices?companyId=${encodeURIComponent(companyId)}`, { credentials: "include" }),
        ]);
        if (aborted) return;
        const cData = await cRes.json().catch(() => ({}));
        const iData = await iRes.json().catch(() => ({}));
        if (!cRes.ok) throw new Error(cData?.error || "فشل تحميل العملاء");
        if (!iRes.ok) throw new Error(iData?.error || "فشل تحميل الفواتير");
        setCustomers(Array.isArray(cData.customers) ? cData.customers : []);
        setInvoices(Array.isArray(iData.invoices) ? iData.invoices : []);
      } catch (e: any) {
        if (!aborted) setError("تعذّر تحميل البيانات: " + (e?.message || "خطأ غير معروف"));
      } finally {
        if (!aborted) setLoadingData(false);
      }
    })();
    return () => { aborted = true; };
  }, [companyId]);

  // 2) read query params after mount (separate effect to avoid race with data)
  useEffect(() => {
    if (!searchParams) return;
    const c = searchParams.get("customerId") || "";
    const inv = searchParams.get("invoiceId") || "";
    if (c || inv) {
      setForm(prev => ({ ...prev, customerId: c, invoiceId: inv }));
    }
  }, [searchParams]);

  // 3) auto-title from invoice (only if user didn't set one)
  useEffect(() => {
    if (!form.invoiceId || !invoices.length || form.title) return;
    const inv = invoices.find(i => i.id === form.invoiceId);
    if (inv) setForm(prev => ({ ...prev, title: prev.title || `عقد مرتبط بالفاتورة ${inv.invoiceNumber}` }));
  }, [form.invoiceId, invoices, form.title]);

  // Validate locally before sending
  const validate = (): string | null => {
    if (!companyId) return "معرّف الشركة غير متوفر — أعد فتح الصفحة من لوحة الشركة";
    if (!form.customerId) return "يرجى اختيار العميل";
    if (!form.scopeOfWork || form.scopeOfWork.trim().length < 3) return "يرجى كتابة وصف نطاق العمل (3 أحرف على الأقل)";
    const amt = parseFloat(form.totalAmount);
    if (!form.totalAmount || isNaN(amt) || amt <= 0) return "يرجى إدخال إجمالي مبلغ موجب للعقد";
    if (form.deliveryDate) {
      const d = new Date(form.deliveryDate);
      if (isNaN(d.getTime())) return "تاريخ التسليم غير صحيح";
    }
    return null;
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || submitting) return; // dedupe clicks
    const v = validate();
    if (v) { setError(v); return; }
    setError("");
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const payload: any = {
        companyId,
        customerId: form.customerId,
        scopeOfWork: form.scopeOfWork,
        totalAmount: parseFloat(form.totalAmount),
      };
      if (form.invoiceId) payload.invoiceId = form.invoiceId;
      if (form.title) payload.title = form.title;
      if (form.deliveryDate) payload.deliveryDate = form.deliveryDate;
      if (form.terms) payload.terms = form.terms;
      if (form.notes) payload.notes = form.notes;
      if (form.status) payload.status = form.status;

      const r = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "فشل إنشاء العقد");
      setSuccess(j.contract);
      // navigate after short delay so user sees the success state
      setTimeout(() => router.push(`/c/${companyId}/contracts/${j.contract.id}`), 600);
    } catch (e: any) {
      setError(e?.message || "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
      // release lock after a moment to allow genuine retries on failure
      setTimeout(() => { submitLockRef.current = false; }, 1500);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href={`/c/${companyId}/contracts`} className="hover:underline">← العودة لقائمة العقود</Link>
      </div>
      <h1 className="text-xl font-extrabold text-[#0f2a54] mt-2">إنشاء عقد تفصيلي جديد</h1>
      <p className="text-xs text-slate-500">مرتبط بالعميل — الفاتورة اختيارية — المتبقي يحسب تلقائياً من الدفعات</p>

      {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">⚠️ {error}</div>}
      {success && <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl p-4 text-sm">✓ تم إنشاء العقد <b className="font-mono">{success.contractNumber}</b> — جاري التحويل...</div>}

      <form onSubmit={create} className="bg-white border rounded-2xl p-6 mt-4 max-w-[860px]" noValidate>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold">العميل *</label>
            <select required value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} disabled={loadingData} className="w-full mt-1 border rounded-xl px-3 py-2.5 bg-slate-50 disabled:opacity-60">
              <option value="">{loadingData ? "جاري التحميل..." : "اختر العميل *"}</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ""}</option>)}
            </select>
            {!loadingData && customers.length === 0 && (
              <div className="text-[11px] text-amber-700 mt-1">لا يوجد عملاء. <Link href={`/c/${companyId}/customers`} className="underline">أضف عميلاً أولاً</Link></div>
            )}
          </div>
          <div>
            <label className="text-xs font-bold">ربط بفاتورة (اختياري)</label>
            <select value={form.invoiceId} onChange={e => setForm({ ...form, invoiceId: e.target.value })} disabled={loadingData} className="w-full mt-1 border rounded-xl px-3 py-2.5 bg-slate-50 disabled:opacity-60">
              <option value="">— بدون ربط —</option>
              {invoices.map(inv => <option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {parseFloat(inv.total).toLocaleString("ar-SA")} SAR</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold">عنوان العقد</label>
            <input placeholder="مثال: عقد توريد وتركيب" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2.5 bg-slate-50" />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-bold">وصف المنتجات/الخدمات ونطاق العمل *</label>
            <textarea required value={form.scopeOfWork} onChange={e => setForm({ ...form, scopeOfWork: e.target.value })} rows={4} placeholder="مثال: توريد وتركيب 20 جهاز حاسب + خدمات صيانة لمدة سنة..." className="w-full mt-1 border rounded-xl p-3 bg-slate-50" />
          </div>

          <div>
            <label className="text-xs font-bold">إجمالي مبلغ العقد (SAR) *</label>
            <input required type="number" min="0.01" step="0.01" value={form.totalAmount} onChange={e => setForm({ ...form, totalAmount: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2.5 bg-slate-50" />
            <div className="text-[11px] text-slate-500 mt-1">المتبقي سيُحسب: الإجمالي − مجموع الدفعات</div>
          </div>
          <div>
            <label className="text-xs font-bold">موعد التسليم</label>
            <input type="date" value={form.deliveryDate} onChange={e => setForm({ ...form, deliveryDate: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2.5 bg-slate-50" />
          </div>

          <div>
            <label className="text-xs font-bold">الحالة</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2.5 bg-slate-50">
              {statusOptions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold">العملة</label>
            <input value="SAR" readOnly className="w-full mt-1 border rounded-xl px-3 py-2.5 bg-slate-100 text-slate-500" />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-bold">الشروط والبنود الخاصة</label>
            <textarea value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })} rows={3} placeholder="مثال: 1- مدة الضمان سنة من التسليم / 2- غرامة تأخير 1%..." className="w-full mt-1 border rounded-xl p-3 bg-slate-50" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold">ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full mt-1 border rounded-xl p-3 bg-slate-50" />
          </div>
        </div>

        <div className="flex gap-2 mt-6 border-t pt-4">
          <button disabled={submitting || loadingData} type="submit" className="bg-[#0f2a54] text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? "جاري الحفظ..." : "حفظ العقد"}
          </button>
          <Link href={`/c/${companyId}/contracts`} className="border px-6 py-3 rounded-xl">إلغاء</Link>
        </div>
        <div className="text-[11px] text-slate-400 mt-2">سيتم تسجيل العملية في سجل التدقيق • لن تُنشأ أي فاتورة أو دفعة تلقائياً</div>
      </form>
    </>
  );
}

export default function NewContractPage() {
  const params = useParams<{ companyId: string }>();
  const companyId = params?.companyId || "";
  return (
    <AppShell companyId={companyId}>
      <Suspense fallback={<div className="p-10 text-center text-slate-500">جاري التحميل...</div>}>
        <NewContractInner />
      </Suspense>
    </AppShell>
  );
}
