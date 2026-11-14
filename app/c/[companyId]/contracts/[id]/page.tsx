"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import { printElement } from "@/lib/print";

const statusOptions = [
  { v: "draft", l: "مسودة" },
  { v: "pending_approval", l: "بانتظار الاعتماد" },
  { v: "approved", l: "معتمد" },
  { v: "in_progress", l: "قيد التنفيذ" },
  { v: "completed", l: "مكتمل" },
  { v: "cancelled", l: "ملغي" },
];

export default function ContractDetail() {
  const params = useParams<{ companyId: string; id: string }>(); const companyId = params.companyId; const id = params.id;
  const [data, setData] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [payForm, setPayForm] = useState<any>({ amount: "", paymentDate: new Date().toISOString().slice(0, 10), method: "cash", reference: "", notes: "" });
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [showPreview, setShowPreview] = useState(false);

  const load = async () => {
    const r = await fetch(`/api/contracts/${id}`);
    const j = await r.json();
    if (r.ok) {
      setData(j);
      setPayments(j.payments || []);
      setEditForm({ title: j.contract.title || "", scopeOfWork: j.contract.scopeOfWork, terms: j.contract.terms || "", notes: j.contract.notes || "", totalAmount: j.contract.totalAmount, deliveryDate: j.contract.deliveryDate ? new Date(j.contract.deliveryDate).toISOString().slice(0, 10) : "", status: j.contract.status });
    }
  };
  useEffect(() => { load(); }, [id]);

  const addPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch(`/api/contracts/${id}/payments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payForm, amount: parseFloat(payForm.amount) }) });
    const j = await r.json();
    if (r.ok) { setPayForm({ amount: "", paymentDate: new Date().toISOString().slice(0, 10), method: "cash", reference: "", notes: "" }); load(); } else alert(j.error);
  };

  const deletePayment = async (paymentId: string) => {
    if (!confirm("هل أنت متأكد من إلغاء هذه الدفعة؟ سيُعاد حساب المتبقي تلقائياً.")) return;
    const r = await fetch(`/api/contracts/${id}/payments?paymentId=${paymentId}`, { method: "DELETE" });
    if (r.ok) load(); else alert("خطأ");
  };

  const saveEdit = async () => {
    const r = await fetch(`/api/contracts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...editForm, totalAmount: parseFloat(editForm.totalAmount) }) });
    if (r.ok) { setEditMode(false); load(); } else { const j = await r.json(); alert(j.error); }
  };

  const approve = async () => {
    if (!confirm("اعتماد العقد؟")) return;
    const r = await fetch(`/api/contracts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }) });
    if (r.ok) load();
  };

  const doPrint = () => {
    printElement("print-contract", {
      title: `عقد ${data.contract.contractNumber}`,
      paper: "A4",
      styles: `
        body { padding:0 !important; }
        #print-contract { max-width:none !important; margin:0 !important; padding:0 !important; border:none !important; box-shadow:none !important; }
        #print-contract .rounded-2xl { border-radius:0 !important; }
        table { margin-top:12px !important; }
        th, td { border:1px solid #cbd5e1 !important; padding:8px !important; }
        th { background:#0f2a54 !important; color:#fff !important; }
        .print-sign { margin-top:30px !important; }
      `,
    });
  };

  if (!data) return <AppShell companyId={companyId}><div className="p-10 text-center">جاري التحميل...</div></AppShell>;

  const c = data.contract;
  const company = data.company;
  const customer = data.customer;
  const paid = payments.reduce((a, p) => a + parseFloat(p.amount), 0);
  const remaining = parseFloat(c.totalAmount) - paid;

  return (
    <AppShell companyId={companyId}>
      <div className="flex flex-wrap gap-2 items-center justify-between no-print">
        <div>
          <h1 className="text-xl font-extrabold text-[#0f2a54]">عقد رقم {c.contractNumber}</h1>
          <p className="text-xs text-slate-500">تاريخ الإنشاء: {new Date(c.createdAt).toLocaleDateString("ar-SA")} • الحالة: {c.status}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPreview(!showPreview)} className="bg-white border px-4 py-2 rounded-xl text-sm font-medium">{showPreview ? "إخفاء المعاينة" : "👁️ معاينة قبل الطباعة"}</button>
          <button onClick={doPrint} className="bg-[#0f2a54] text-white px-5 py-2 rounded-xl text-sm font-bold">🖨️ طباعة / PDF</button>
          <button onClick={() => doPrint()} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm">تصدير PDF</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
        <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">إجمالي العقد</div><div className="text-lg font-black text-[#0f2a54]">{parseFloat(c.totalAmount).toLocaleString("ar-SA")} {company.currency}</div></div>
        <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">المدفوع</div><div className="text-lg font-black text-emerald-600">{paid.toLocaleString("ar-SA")} {company.currency}</div><div className="text-[11px] text-slate-400">{payments.length} دفعة</div></div>
        <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">المتبقي (تلقائي)</div><div className="text-lg font-black text-red-600">{remaining.toLocaleString("ar-SA")} {company.currency}</div><div className="w-full bg-slate-100 h-1.5 rounded-full mt-1"><div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (paid / parseFloat(c.totalAmount)) * 100)}%` }}></div></div></div>
        <div className="bg-white border rounded-2xl p-4">
          <div className="text-xs text-slate-500">الحالة</div>
          <select value={c.status} onChange={async e => { await fetch(`/api/contracts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: e.target.value }) }); load(); }} className="mt-1 w-full border rounded-xl px-3 py-2 bg-slate-50 text-sm">
            {statusOptions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          {c.status === "pending_approval" && <button onClick={approve} className="mt-2 w-full bg-blue-600 text-white py-1.5 rounded-xl text-xs font-bold">اعتماد العقد</button>}
        </div>
      </div>

      {/* Contract preview - MUST NOT include platform name, only company data */}
      <div id="print-contract" className="print-area bg-white border rounded-2xl p-6 mt-6">
        {/* Company header only - as requested */}
        <div className="flex justify-between border-b-2 border-[#0f2a54] pb-4">
          <div>
            <div className="text-xl font-extrabold text-[#0f2a54]">{company.name}</div>
            {company.nameEn && <div className="text-xs text-slate-500">{company.nameEn}</div>}
            <div className="text-xs text-slate-600 mt-2 space-y-0.5">
              {company.address && <div>العنوان: {company.address}</div>}
              {company.phone && <div>الهاتف: {company.phone}</div>}
              {company.email && <div>البريد: {company.email}</div>}
              {company.taxNumber && <div>الرقم الضريبي: {company.taxNumber}</div>}
            </div>
          </div>
          <div className="text-left">
            <div className="bg-[#0f2a54] text-white px-4 py-2 rounded-xl text-center">
              <div className="text-sm font-bold">عقد اتفاق</div>
              <div className="text-xs font-mono">{c.contractNumber}</div>
            </div>
            <div className="text-xs text-slate-600 mt-2 space-y-1">
              <div>تاريخ العقد: {new Date(c.createdAt).toLocaleDateString("ar-SA")}</div>
              <div>تاريخ التسليم: {c.deliveryDate ? new Date(c.deliveryDate).toLocaleDateString("ar-SA") : "—"}</div>
              <div>الحالة: {statusOptions.find(s => s.v === c.status)?.l}</div>
            </div>
          </div>
        </div>

        {c.title && <div className="mt-4 text-center font-bold text-[#0f2a54] border border-slate-200 rounded-xl py-2 bg-slate-50">عنوان العقد: {c.title}</div>}

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="border rounded-xl p-4 bg-slate-50">
            <div className="font-bold text-sm text-[#0f2a54] mb-2">بيانات العميل</div>
            <div className="text-sm space-y-1">
              <div><b>اسم العميل:</b> {customer?.name}</div>
              <div><b>رقم الهاتف:</b> {customer?.phone || "—"}</div>
              <div><b>البريد:</b> {customer?.email || "—"}</div>
              <div><b>العنوان:</b> {customer?.address || customer?.city || "—"}</div>
              {customer?.taxNumber && <div><b>الرقم الضريبي:</b> {customer.taxNumber}</div>}
            </div>
          </div>
          <div className="border rounded-xl p-4 bg-white">
            <div className="font-bold text-sm text-[#0f2a54] mb-2">الملخص المالي</div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b"><td className="py-1.5">إجمالي العقد</td><td className="py-1.5 font-bold text-left">{parseFloat(c.totalAmount).toLocaleString("ar-SA")} {company.currency}</td></tr>
                <tr className="border-b"><td className="py-1.5">المدفوع</td><td className="py-1.5 font-bold text-emerald-600 text-left">{paid.toLocaleString("ar-SA")} {company.currency}</td></tr>
                <tr><td className="py-1.5 font-bold">المتبقي</td><td className="py-1.5 font-black text-red-600 text-left">{remaining.toLocaleString("ar-SA")} {company.currency}</td></tr>
              </tbody>
            </table>
            <div className="text-[11px] text-slate-500 mt-2">المتبقي = الإجمالي − مجموع الدفعات • يُحدث تلقائياً عند أي دفعة</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="font-bold text-[#0f2a54] mb-2">وصف المنتجات/الخدمات ونطاق العمل</div>
          <div className="border rounded-xl p-4 bg-white whitespace-pre-wrap text-sm leading-6">{c.scopeOfWork}</div>
        </div>

        {c.terms && <div className="mt-4"><div className="font-bold text-sm">الشروط والبنود الخاصة</div><div className="border rounded-xl p-4 bg-amber-50/50 whitespace-pre-wrap text-sm leading-6">{c.terms}</div></div>}
        {c.notes && <div className="mt-4"><div className="font-bold text-sm">ملاحظات</div><div className="border rounded-xl p-4 bg-white whitespace-pre-wrap text-sm">{c.notes}</div></div>}

        {/* Payments table in print */}
        <div className="mt-6">
          <div className="font-bold text-sm">سجل الدفعات</div>
          <table className="w-full text-sm mt-2">
            <thead><tr className="bg-[#0f2a54] text-white"><th className="p-2 text-right">التاريخ</th><th className="p-2 text-right">المبلغ</th><th className="p-2 text-right">الطريقة</th><th className="p-2 text-right">المرجع</th></tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-t"><td className="p-2">{new Date(p.paymentDate).toLocaleDateString("ar-SA")}</td><td className="p-2 font-bold">{parseFloat(p.amount).toLocaleString("ar-SA")} {company.currency}</td><td className="p-2">{p.method}</td><td className="p-2">{p.reference || "—"}</td></tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={4} className="p-3 text-center text-slate-400">لا توجد دفعات مسجلة</td></tr>}
              <tr className="bg-slate-50 font-bold"><td className="p-2">الإجمالي المدفوع</td><td className="p-2">{paid.toLocaleString("ar-SA")}</td><td colSpan={2} className="p-2 text-red-600">المتبقي: {remaining.toLocaleString("ar-SA")}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
          <div className="text-center">
            <div className="border-t border-slate-400 pt-2 mt-12">توقيع العميل / الختم</div>
            <div className="text-xs text-slate-500">{customer?.name} — {customer?.phone}</div>
          </div>
          <div className="text-center">
            <div className="border-t border-slate-400 pt-2 mt-12">توقيع الشركة / الختم</div>
            <div className="text-xs text-slate-500">{company.name}</div>
          </div>
        </div>

        {/* Custom footer per company - ONLY company footer, no platform credit */}
        {company.contractFooter && (
          <div className="mt-8 border-t-2 border-[#0f2a54] pt-3 text-center text-xs text-slate-600 whitespace-pre-wrap">
            {company.contractFooter}
          </div>
        )}
        {!company.contractFooter && (
          <div className="mt-8 text-center text-[11px] text-slate-400 border-t pt-3">
            هذه الوثيقة صادرة من {company.name} • {company.phone || ""} • {company.email || ""}
          </div>
        )}
      </div>

      {showPreview && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs leading-5">
          <div className="font-bold text-blue-900">معاينة الطباعة:</div>
          <div>المستند أعلاه هو النسخة النهائية للطباعة — يحتوي فقط على بيانات الشركة ({company.name}) دون إضافة اسم المنصة أو عبارة الاعتماد، حسب طلبك. تذييل العقد قابل للتخصيص من إعدادات الشركة.</div>
        </div>
      )}

      {/* Edit & Payments management */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white border rounded-2xl p-5">
          <div className="flex justify-between items-center">
            <div className="font-bold">إدارة العقد</div>
            <button onClick={() => setEditMode(!editMode)} className="text-xs bg-slate-100 px-3 py-1.5 rounded-full">{editMode ? "إلغاء" : "تعديل"}</button>
          </div>
          {!editMode ? (
            <div className="mt-4 text-sm space-y-2">
              <div><b>العنوان:</b> {c.title || "—"}</div>
              <div><b>المبلغ:</b> {parseFloat(c.totalAmount).toLocaleString("ar-SA")} {company.currency}</div>
              <div><b>التسليم:</b> {c.deliveryDate ? new Date(c.deliveryDate).toLocaleDateString("ar-SA") : "—"}</div>
              <div className="text-xs text-slate-500">التعديل على بيانات العقد لا ينشئ دفعات تلقائية ولا يغير الدفعات السابقة — تُحفظ كما هي.</div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} placeholder="عنوان العقد" className="w-full border rounded-xl px-3 py-2 bg-slate-50" />
              <textarea value={editForm.scopeOfWork} onChange={e => setEditForm({ ...editForm, scopeOfWork: e.target.value })} rows={3} className="w-full border rounded-xl p-3 bg-slate-50" />
              <input type="number" value={editForm.totalAmount} onChange={e => setEditForm({ ...editForm, totalAmount: e.target.value })} className="w-full border rounded-xl px-3 py-2 bg-slate-50" />
              <input type="date" value={editForm.deliveryDate} onChange={e => setEditForm({ ...editForm, deliveryDate: e.target.value })} className="w-full border rounded-xl px-3 py-2 bg-slate-50" />
              <textarea value={editForm.terms} onChange={e => setEditForm({ ...editForm, terms: e.target.value })} placeholder="الشروط" rows={2} className="w-full border rounded-xl p-3 bg-slate-50" />
              <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="ملاحظات" rows={2} className="w-full border rounded-xl p-3 bg-slate-50" />
              <button onClick={saveEdit} className="w-full bg-[#0f2a54] text-white py-2.5 rounded-xl font-bold">حفظ التعديلات</button>
            </div>
          )}
        </div>

        <div className="bg-white border rounded-2xl p-5">
          <div className="font-bold">الدفعات (تحدث المتبقي تلقائياً)</div>
          <form onSubmit={addPayment} className="mt-3 grid grid-cols-2 gap-2">
            <input required type="number" step="0.01" placeholder="المبلغ *" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} className="border rounded-xl px-3 py-2 bg-slate-50" />
            <input type="date" value={payForm.paymentDate} onChange={e => setPayForm({ ...payForm, paymentDate: e.target.value })} className="border rounded-xl px-3 py-2 bg-slate-50" />
            <select value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })} className="border rounded-xl px-3 py-2 bg-slate-50">
              <option value="cash">نقدي</option><option value="transfer">تحويل بنكي</option><option value="cheque">شيك</option><option value="card">بطاقة</option>
            </select>
            <input placeholder="مرجع/رقم الحوالة" value={payForm.reference} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} className="border rounded-xl px-3 py-2 bg-slate-50" />
            <input placeholder="ملاحظة" value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} className="col-span-2 border rounded-xl px-3 py-2 bg-slate-50" />
            <button type="submit" className="col-span-2 bg-emerald-600 text-white py-2 rounded-xl font-bold">+ إضافة دفعة</button>
          </form>
          <div className="mt-4 space-y-2 max-h-[220px] overflow-auto">
            {payments.map(p => (
              <div key={p.id} className="flex justify-between items-center border rounded-xl p-3 bg-slate-50">
                <div className="text-sm">
                  <div className="font-bold">{parseFloat(p.amount).toLocaleString("ar-SA")} {company.currency} — {p.method}</div>
                  <div className="text-xs text-slate-500">{new Date(p.paymentDate).toLocaleDateString("ar-SA")} • {p.reference || "بدون مرجع"}</div>
                </div>
                <button onClick={() => deletePayment(p.id)} className="text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full">إلغاء</button>
              </div>
            ))}
            {payments.length === 0 && <div className="text-xs text-center text-slate-400 py-4">لا دفعات — المتبقي = الإجمالي كاملاً</div>}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">منع التكرار: نفس المرجع والمبلغ لن يُحتسب مرتين • إلغاء الدفعة يُعيد حساب المتبقي فوراً</div>
        </div>
      </div>
    </AppShell>
  );
}
