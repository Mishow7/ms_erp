"use client";
import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import Link from "next/link";

function ShiftsInner() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const sp = useSearchParams();
  const [shifts, setShifts] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [selected, setSelected] = useState<string | null>(sp?.get("id") || null);
  const [closing, setClosing] = useState(false);
  const [closingCash, setClosingCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [showReopen, setShowReopen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenCash, setReopenCash] = useState("");
  const [showCash, setShowCash] = useState(false);
  const [cashForm, setCashForm] = useState<any>({ type: "deposit", amount: "", reason: "", reference: "" });

  const load = () => {
    fetch(`/api/pos/shifts?companyId=${companyId}`).then(r => r.json()).then(d => {
      setShifts(d.shifts || []);
      if (selected) {
        fetch(`/api/pos/shifts/${selected}`).then(r => r.json()).then(setData);
      } else if (d.shifts?.length > 0) {
        fetch(`/api/pos/shifts/${d.shifts[0].id}`).then(r => r.json()).then(setData);
        setSelected(d.shifts[0].id);
      }
    });
  };
  useEffect(() => { load(); }, [companyId]);
  useEffect(() => { if (selected) fetch(`/api/pos/shifts/${selected}`).then(r => r.json()).then(setData); }, [selected]);

  const closeShift = async () => {
    const r = await fetch(`/api/pos/shifts/${selected}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "close", closingCash: parseFloat(closingCash), notes: closeNotes }) });
    const j = await r.json();
    setClosing(false);
    if (r.ok) { alert(`تم الإغلاق. المتوقع: ${j.expected.toFixed(2)} — الفعلي: ${closingCash} — الفرق: ${j.diff.toFixed(2)}${j.needsApproval ? " — يحتاج اعتماد مدير" : ""}`); load(); }
    else alert(j.error);
  };

  const reopen = async () => {
    if (!confirm("إعادة فتح هذه الوردية؟ يتطلب صلاحية مدير الشركة.")) return;
    const r = await fetch(`/api/pos/shifts/${selected}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reopen", reason: reopenReason, newClosingCash: reopenCash ? parseFloat(reopenCash) : null }) });
    const j = await r.json();
    setShowReopen(false);
    if (r.ok) { alert("تم إعادة الفتح"); load(); } else alert(j.error);
  };

  const addCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/pos/cash-movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shiftId: selected, ...cashForm, amount: parseFloat(cashForm.amount) }) });
    const j = await r.json();
    if (r.ok) { setShowCash(false); setCashForm({ type: "deposit", amount: "", reason: "", reference: "" }); load(); }
    else alert(j.error);
  };

  return (
    <AppShell companyId={companyId}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-[#0f2a54]">إدارة ورديات نقاط البيع</h1>
          <p className="text-xs text-slate-500">فتح وإغلاق الورديات + مطابقة النقد + الحركات النقدية</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/c/${companyId}/pos-shifts/report`} className="bg-white border px-4 py-2 rounded-xl text-sm">📊 تقرير الورديات</Link>
          <Link href={`/c/${companyId}/pos`} className="bg-[#0f2a54] text-white px-4 py-2 rounded-xl text-sm font-bold">🛒 شاشة البيع</Link>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 mt-4">
        <div className="col-span-12 lg:col-span-4 bg-white border rounded-2xl p-3 max-h-[600px] overflow-auto">
          <div className="font-bold text-sm mb-2">الورديات ({shifts.length})</div>
          {shifts.map(s => (
            <button key={s.id} onClick={() => setSelected(s.id)} className={`w-full text-right p-3 rounded-xl border mb-2 ${selected === s.id ? "border-[#0f2a54] bg-blue-50" : "hover:bg-slate-50"}`}>
              <div className="flex justify-between">
                <div className="text-sm font-bold">{s.userName}</div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100"}`}>{s.status === "open" ? "مفتوحة" : "مغلقة"}</span>
              </div>
              <div className="text-[11px] text-slate-500">فتح: {new Date(s.openedAt).toLocaleString("ar-SA")}</div>
              {s.closedAt && <div className="text-[11px] text-slate-500">إغلاق: {new Date(s.closedAt).toLocaleString("ar-SA")}</div>}
            </button>
          ))}
          {shifts.length === 0 && <div className="text-xs text-slate-400 text-center py-4">لا توجد ورديات</div>}
        </div>

        <div className="col-span-12 lg:col-span-8">
          {data ? (
            <div className="bg-white border rounded-2xl p-5">
              <div className="flex justify-between items-start border-b pb-2 mb-3">
                <div>
                  <div className="font-bold text-[#0f2a54]">وردية — {data.shift.userName} — {data.shift.registerName}</div>
                  <div className="text-xs text-slate-500">الحالة: <b>{data.shift.status === "open" ? "مفتوحة" : "مغلقة"}</b></div>
                </div>
                <div className="flex gap-2">
                  {data.shift.status === "open" && <button onClick={() => setShowCash(true)} className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-sm">+ حركة نقدية</button>}
                  {data.shift.status === "open" && <button onClick={() => setClosing(true)} className="bg-amber-600 text-white px-3 py-1.5 rounded-xl text-sm">إغلاق الوردية</button>}
                  {data.shift.status === "closed" && <button onClick={() => setShowReopen(true)} className="bg-slate-700 text-white px-3 py-1.5 rounded-xl text-sm">إعادة فتح</button>}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="bg-slate-50 rounded-xl p-3"><div className="text-xs text-slate-500">رصيد البداية</div><div className="font-bold">{data.summary.openingCash.toLocaleString("ar-SA")}</div></div>
                <div className="bg-emerald-50 rounded-xl p-3"><div className="text-xs text-slate-500">مبيعات نقدية</div><div className="font-bold">{(data.summary.salesByMethod.cash?.total || 0).toLocaleString("ar-SA")}</div></div>
                <div className="bg-red-50 rounded-xl p-3"><div className="text-xs text-slate-500">مرتجعات نقدية</div><div className="font-bold">{(data.summary.returnsByMethod.cash || 0).toLocaleString("ar-SA")}</div></div>
                <div className="bg-blue-50 rounded-xl p-3"><div className="text-xs text-slate-500">المتوقع</div><div className="font-bold">{data.summary.expectedCash.toLocaleString("ar-SA")}</div></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                <div className="border rounded-xl p-2"><div className="text-slate-500">بطاقة</div><b>{(data.summary.salesByMethod.card?.total || 0).toLocaleString("ar-SA")}</b></div>
                <div className="border rounded-xl p-2"><div className="text-slate-500">تحويل</div><b>{(data.summary.salesByMethod.transfer?.total || 0).toLocaleString("ar-SA")}</b></div>
                <div className="border rounded-xl p-2"><div className="text-slate-500">آجل</div><b>{(data.summary.salesByMethod.credit?.total || 0).toLocaleString("ar-SA")}</b></div>
                <div className="border rounded-xl p-2"><div className="text-slate-500">إيداعات/سحوبات</div><b>{(data.summary.cashMovsSummary.deposit).toLocaleString("ar-SA")} / {(data.summary.cashMovsSummary.withdrawal + data.summary.cashMovsSummary.expense).toLocaleString("ar-SA")}</b></div>
              </div>

              {data.shift.closingCash && <div className="mt-3 p-3 bg-slate-50 rounded-xl text-sm">
                <div>الفعلي: <b>{parseFloat(data.shift.closingCash).toLocaleString("ar-SA")}</b></div>
                <div>المتوقع: <b>{data.summary.expectedCash.toLocaleString("ar-SA")}</b></div>
                <div>الفرق: <b className={data.summary.difference && data.summary.difference < 0 ? "text-red-600" : "text-emerald-600"}>{(data.summary.difference || 0).toLocaleString("ar-SA")}</b></div>
              </div>}

              <div className="mt-4">
                <div className="text-sm font-bold mb-2">الحركات النقدية ({data.cashMovements.length})</div>
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50"><th className="p-2 text-right">النوع</th><th className="p-2 text-right">المبلغ</th><th className="p-2 text-right">السبب</th><th className="p-2 text-right">الوقت</th></tr></thead>
                  <tbody>{data.cashMovements.map((m: any) => (
                    <tr key={m.id} className="border-t"><td className="p-2">{m.type}</td><td className="p-2 font-bold">{parseFloat(m.amount).toLocaleString("ar-SA")}</td><td className="p-2">{m.reason || "—"}</td><td className="p-2 text-slate-500">{new Date(m.createdAt).toLocaleString("ar-SA")}</td></tr>
                  ))}{data.cashMovements.length === 0 && <tr><td colSpan={4} className="p-2 text-center text-slate-400">لا حركات نقدية</td></tr>}</tbody>
                </table>
              </div>

              <div className="mt-4">
                <div className="text-sm font-bold mb-2">المبيعات ({data.sales.length})</div>
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50"><th className="p-2 text-right">الإيصال</th><th className="p-2 text-right">الإجمالي</th><th className="p-2 text-right">المدفوع</th><th className="p-2 text-right">الوقت</th></tr></thead>
                  <tbody>{data.sales.map((s: any) => (
                    <tr key={s.id} className="border-t"><td className="p-2 font-mono">{s.receiptNumber}</td><td className="p-2">{parseFloat(s.total).toLocaleString("ar-SA")}</td><td className="p-2 text-emerald-600">{parseFloat(s.paid).toLocaleString("ar-SA")}</td><td className="p-2 text-slate-500">{new Date(s.createdAt).toLocaleString("ar-SA")}</td></tr>
                  ))}{data.sales.length === 0 && <tr><td colSpan={4} className="p-2 text-center text-slate-400">لا مبيعات</td></tr>}</tbody>
                </table>
              </div>
            </div>
          ) : <div className="p-10 text-center text-slate-500">اختر وردية لعرض تفاصيلها</div>}
        </div>
      </div>

      {closing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="font-bold text-[#0f2a54]">إغلاق الوردية</h2>
            <p className="text-xs text-slate-500">أدخل النقد الفعلي الموجود في الصندوق</p>
            {data && <div className="mt-2 text-sm">المتوقع: <b className="text-[#0f2a54]">{data.summary.expectedCash.toLocaleString("ar-SA")} SAR</b></div>}
            <input type="number" step="0.01" value={closingCash} onChange={e => setClosingCash(e.target.value)} placeholder="النقد الفعلي" className="w-full mt-3 border rounded-xl px-3 py-2.5 bg-slate-50" />
            <textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} placeholder="ملاحظات (سبب العجز/الزيادة)" className="w-full mt-2 border rounded-xl p-3 bg-slate-50" />
            <div className="flex gap-2 mt-4"><button onClick={closeShift} className="flex-1 bg-amber-600 text-white py-2.5 rounded-xl font-bold">تأكيد الإغلاق</button><button onClick={() => setClosing(false)} className="flex-1 border py-2.5 rounded-xl">إلغاء</button></div>
          </div>
        </div>
      )}

      {showCash && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={addCash} className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="font-bold text-[#0f2a54]">حركة نقدية على الصندوق</h2>
            <select value={cashForm.type} onChange={e => setCashForm({ ...cashForm, type: e.target.value })} className="w-full mt-3 border rounded-xl px-3 py-2.5 bg-slate-50">
              <option value="deposit">إيداع (+)</option>
              <option value="withdrawal">سحب (-)</option>
              <option value="expense">مصروف (-)</option>
              <option value="tip_in">إكرامية داخلة (+)</option>
              <option value="tip_out">إكرامية خارجة (-)</option>
              <option value="adjustment">تسوية (+/-)</option>
            </select>
            <input required type="number" step="0.01" value={cashForm.amount} onChange={e => setCashForm({ ...cashForm, amount: e.target.value })} placeholder="المبلغ" className="w-full mt-2 border rounded-xl px-3 py-2.5 bg-slate-50" />
            <input value={cashForm.reason} onChange={e => setCashForm({ ...cashForm, reason: e.target.value })} placeholder="السبب *" className="w-full mt-2 border rounded-xl px-3 py-2.5 bg-slate-50" required />
            <input value={cashForm.reference} onChange={e => setCashForm({ ...cashForm, reference: e.target.value })} placeholder="مرجع" className="w-full mt-2 border rounded-xl px-3 py-2.5 bg-slate-50" />
            <div className="flex gap-2 mt-4"><button type="submit" className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold">حفظ</button><button type="button" onClick={() => setShowCash(false)} className="flex-1 border py-2.5 rounded-xl">إلغاء</button></div>
          </form>
        </div>
      )}

      {showReopen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="font-bold text-[#0f2a54]">إعادة فتح الوردية</h2>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2 mt-2">يحتاج صلاحية مدير الشركة — سيتم تسجيل السبب والقيم قبل التعديل</p>
            <input value={reopenReason} onChange={e => setReopenReason(e.target.value)} placeholder="سبب إعادة الفتح *" className="w-full mt-3 border rounded-xl px-3 py-2.5 bg-slate-50" />
            <input type="number" step="0.01" value={reopenCash} onChange={e => setReopenCash(e.target.value)} placeholder="نقد ختامي جديد (اختياري)" className="w-full mt-2 border rounded-xl px-3 py-2.5 bg-slate-50" />
            <div className="flex gap-2 mt-4"><button onClick={reopen} className="flex-1 bg-slate-700 text-white py-2.5 rounded-xl font-bold">تأكيد</button><button onClick={() => setShowReopen(false)} className="flex-1 border py-2.5 rounded-xl">إلغاء</button></div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function POSShiftsPage() {
  const params = useParams<{ companyId: string }>();
  return <Suspense fallback={<div className="p-10 text-center">جاري التحميل...</div>}><ShiftsInner /></Suspense>;
}
