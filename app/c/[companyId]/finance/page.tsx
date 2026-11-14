"use client";
import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import { printElement } from "@/lib/print";

const voucherTypes = [
  { key: "receipt", label: "سند قبض", icon: "📥", color: "emerald" },
  { key: "payment", label: "سند صرف", icon: "📤", color: "red" },
  { key: "journal", label: "قيد محاسبي", icon: "📝", color: "blue" },
];

function FinanceInner() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const [tab, setTab] = useState("vouchers");
  const [voucherType, setVoucherType] = useState("receipt");
  const [accounts, setAccounts] = useState<any>({ cashAccounts: [], bankAccounts: [], ledgerAccounts: [], branches: [] });
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showAccForm, setShowAccForm] = useState(false);
  const [accType, setAccType] = useState("cash");
  const [accForm, setAccForm] = useState<any>({ name: "", branchId: "", currency: "SAR", openingBalance: 0, bankName: "", accountNumber: "", iban: "", code: "", accType: "asset" });
  const [form, setForm] = useState<any>({
    voucherDate: new Date().toISOString().slice(0, 10), amount: "", cashAccountId: "", bankAccountId: "",
    customerId: "", supplierId: "", debitAccountId: "", creditAccountId: "", description: "", reference: "",
  });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    fetch(`/api/finance/accounts?companyId=${companyId}`).then(r => r.json()).then(d => setAccounts(d));
    fetch(`/api/finance/vouchers?companyId=${companyId}`).then(r => r.json()).then(d => setVouchers(d.vouchers || []));
    fetch(`/api/customers?companyId=${companyId}`).then(r => r.json()).then(d => setCustomers(d.customers || []));
    fetch(`/api/suppliers?companyId=${companyId}`).then(r => r.json()).then(d => setSuppliers(d.suppliers || []));
  };
  useEffect(() => { load(); }, [companyId]);

  const createVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.amount || parseFloat(form.amount) <= 0) { setError("المبلغ مطلوب"); return; }
    const r = await fetch("/api/finance/vouchers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, type: voucherType, ...form, amount: parseFloat(form.amount) }) });
    const j = await r.json();
    if (r.ok) { setShowForm(false); setForm({ ...form, amount: "", description: "", reference: "" }); load(); setMsg("تم إنشاء السند بنجاح"); setTimeout(() => setMsg(""), 3000); }
    else setError(j.error || "خطأ");
  };

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!accForm.name) { setError("الاسم مطلوب"); return; }
    const r = await fetch("/api/finance/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, type: accType, ...accForm }) });
    const j = await r.json();
    if (r.ok) { setShowAccForm(false); setAccForm({ ...accForm, name: "" }); load(); setMsg("تم إنشاء الحساب بنجاح"); setTimeout(() => setMsg(""), 3000); }
    else setError(j.error || "خطأ");
  };

  const filtered = vouchers.filter(v => v.type === voucherType);

  return (
    <AppShell companyId={companyId}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#0f2a54]">المالية والحسابات</h1>
          <p className="text-xs text-slate-500">سندات القبض والصرف والقيود المحاسبية • الصناديق والحسابات البنكية</p>
        </div>
        {msg && <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-4 py-2 text-xs font-bold">{msg}</div>}
      </div>

      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl w-fit mt-4">
        <button onClick={() => setTab("vouchers")} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === "vouchers" ? "bg-white shadow" : "text-slate-600"}`}>📄 السندات والقيود</button>
        <button onClick={() => setTab("cash")} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === "cash" ? "bg-white shadow" : "text-slate-600"}`}>💵 الصناديق</button>
        <button onClick={() => setTab("bank")} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === "bank" ? "bg-white shadow" : "text-slate-600"}`}>🏦 الحسابات البنكية</button>
        <button onClick={() => setTab("ledger")} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === "ledger" ? "bg-white shadow" : "text-slate-600"}`}>📚 دليل الحسابات</button>
      </div>

      {/* ============ السندات ============ */}
      {tab === "vouchers" && (
        <>
          <div className="flex flex-wrap gap-1 bg-white border rounded-2xl p-2 mt-3">
            {voucherTypes.map(t => (
              <button key={t.key} onClick={() => setVoucherType(t.key)} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${voucherType === t.key ? "bg-[#0f2a54] text-white" : "hover:bg-slate-50"}`}>
                <span>{t.icon}</span> {t.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${voucherType === t.key ? "bg-white/20" : "bg-slate-100"}`}>{filtered.length}</span>
              </button>
            ))}
            <button onClick={() => setShowForm(true)} className="mr-auto bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold">+ سند جديد</button>
          </div>

          <div className="bg-white border rounded-2xl p-4 mt-3">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-slate-600">
                <th className="p-3 text-right">رقم السند</th><th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">البيان</th><th className="p-3 text-right">الصندوق/البنك</th>
                <th className="p-3 text-right">المبلغ</th><th className="p-3 text-right">المرجع</th>
              </tr></thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-[#0f2a54]">{v.voucherNumber}</td>
                    <td className="p-3 text-xs">{new Date(v.voucherDate).toLocaleDateString("ar-SA")}</td>
                    <td className="p-3 text-xs">{v.description || "—"}</td>
                    <td className="p-3 text-xs">{v.cashAccount?.name || v.bankAccount?.name || "—"}</td>
                    <td className={`p-3 font-bold ${v.type === "receipt" ? "text-emerald-600" : v.type === "payment" ? "text-red-600" : "text-blue-600"}`}>
                      {v.type === "payment" ? "-" : v.type === "receipt" ? "+" : ""}{parseFloat(v.amount).toLocaleString("ar-SA")} SAR
                    </td>
                    <td className="p-3 text-xs font-mono">{v.reference || "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا توجد {voucherTypes.find(t => t.key === voucherType)?.label} بعد</td></tr>}
              </tbody>
            </table>
            <div className="flex gap-2 mt-3">
              <button onClick={() => printElement("print-vouchers", { title: voucherTypes.find(t => t.key === voucherType)?.label || "السندات", paper: "A4" })} className="bg-white border px-4 py-2 rounded-xl text-sm no-print">🖨️ طباعة</button>
            </div>
          </div>
        </>
      )}

      {/* ============ الصناديق ============ */}
      {tab === "cash" && (
        <div className="bg-white border rounded-2xl p-4 mt-3">
          <div className="flex justify-between items-center mb-3">
            <div className="font-bold">💵 الصناديق ({accounts.cashAccounts?.length || 0})</div>
            <button onClick={() => { setAccType("cash"); setShowAccForm(true); }} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold">+ إضافة صندوق</button>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {(accounts.cashAccounts || []).map((a: any) => (
              <div key={a.id} className="border rounded-2xl p-4 bg-slate-50">
                <div className="flex justify-between items-start">
                  <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">💵</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200"}`}>{a.isActive ? "نشط" : "موقوف"}</span>
                </div>
                <div className="font-bold mt-2">{a.name}</div>
                <div className="text-xs text-slate-500">{a.currency} • افتتاحي: {parseFloat(a.openingBalance).toLocaleString("ar-SA")}</div>
                <div className="text-xl font-black text-emerald-600 mt-2">{parseFloat(a.currentBalance).toLocaleString("ar-SA")}</div>
                <div className="text-[11px] text-slate-400">الرصيد الحالي</div>
              </div>
            ))}
            {(accounts.cashAccounts || []).length === 0 && <div className="col-span-3 text-center text-slate-400 py-8">لا توجد صناديق — اضغط "إضافة صندوق"</div>}
          </div>
        </div>
      )}

      {/* ============ البنوك ============ */}
      {tab === "bank" && (
        <div className="bg-white border rounded-2xl p-4 mt-3">
          <div className="flex justify-between items-center mb-3">
            <div className="font-bold">🏦 الحسابات البنكية ({accounts.bankAccounts?.length || 0})</div>
            <button onClick={() => { setAccType("bank"); setShowAccForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold">+ إضافة بنك</button>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {(accounts.bankAccounts || []).map((a: any) => (
              <div key={a.id} className="border rounded-2xl p-4 bg-slate-50">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">🏦</div>
                <div className="font-bold mt-2">{a.name}</div>
                <div className="text-xs text-slate-500">{a.bankName || "—"}</div>
                <div className="text-xs font-mono">{a.accountNumber || a.iban || "—"}</div>
                <div className="text-xl font-black text-blue-600 mt-2">{parseFloat(a.openingBalance).toLocaleString("ar-SA")} {a.currency}</div>
              </div>
            ))}
            {(accounts.bankAccounts || []).length === 0 && <div className="col-span-3 text-center text-slate-400 py-8">لا توجد حسابات بنكية — اضغط "إضافة بنك"</div>}
          </div>
        </div>
      )}

      {/* ============ دليل الحسابات ============ */}
      {tab === "ledger" && (
        <div className="bg-white border rounded-2xl p-4 mt-3">
          <div className="flex justify-between items-center mb-3">
            <div className="font-bold">📚 دليل الحسابات ({accounts.ledgerAccounts?.length || 0})</div>
            <button onClick={() => { setAccType("ledger"); setShowAccForm(true); }} className="bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold">+ إضافة حساب</button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-slate-600"><th className="p-3 text-right">الرمز</th><th className="p-3 text-right">اسم الحساب</th><th className="p-3 text-right">النوع</th><th className="p-3 text-right">الرصيد</th></tr></thead>
            <tbody>
              {(accounts.ledgerAccounts || []).map((a: any) => (
                <tr key={a.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold">{a.code}</td>
                  <td className="p-3">{a.name}</td>
                  <td className="p-3 text-xs">{a.type}</td>
                  <td className="p-3 font-bold">{parseFloat(a.balance).toLocaleString("ar-SA")}</td>
                </tr>
              ))}
              {(accounts.ledgerAccounts || []).length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">لا توجد حسابات — أضف حساباً أو أنشئ حساباً محاسبياً بالاختيار التلقائي</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ============ نموذج السند ============ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-auto">
          <form onSubmit={createVoucher} className="bg-white rounded-2xl w-full max-w-[620px] p-6 max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center border-b pb-2 mb-3">
              <h2 className="font-extrabold text-[#0f2a54]">{voucherTypes.find(t => t.key === voucherType)?.icon} {voucherTypes.find(t => t.key === voucherType)?.label} جديد</h2>
              <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 bg-slate-100 rounded-full">✕</button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-2 text-xs mb-3">⚠️ {error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-bold">التاريخ</label>
                <input type="date" value={form.voucherDate} onChange={e => setForm({ ...form, voucherDate: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50" /></div>
              <div><label className="text-xs font-bold">المبلغ *</label>
                <input required type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50" /></div>

              {voucherType !== "journal" && (
                <>
                  <div><label className="text-xs font-bold">الصندوق</label>
                    <select value={form.cashAccountId} onChange={e => setForm({ ...form, cashAccountId: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50">
                      <option value="">— بدون —</option>
                      {(accounts.cashAccounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select></div>
                  <div><label className="text-xs font-bold">الحساب البنكي</label>
                    <select value={form.bankAccountId} onChange={e => setForm({ ...form, bankAccountId: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50">
                      <option value="">— بدون —</option>
                      {(accounts.bankAccounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select></div>
                </>
              )}

              {voucherType === "receipt" && (
                <div className="col-span-2"><label className="text-xs font-bold">العميل</label>
                  <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50">
                    <option value="">— بدون —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
              )}
              {voucherType === "payment" && (
                <div className="col-span-2"><label className="text-xs font-bold">المورد</label>
                  <select value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50">
                    <option value="">— بدون —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select></div>
              )}

              {voucherType === "journal" && (
                <>
                  <div><label className="text-xs font-bold">الحساب المدين *</label>
                    <select required value={form.debitAccountId} onChange={e => setForm({ ...form, debitAccountId: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50">
                      <option value="">— اختر —</option>
                      {(accounts.ledgerAccounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                    </select></div>
                  <div><label className="text-xs font-bold">الحساب الدائن *</label>
                    <select required value={form.creditAccountId} onChange={e => setForm({ ...form, creditAccountId: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50">
                      <option value="">— اختر —</option>
                      {(accounts.ledgerAccounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                    </select></div>
                </>
              )}

              <div className="col-span-2"><label className="text-xs font-bold">البيان</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full mt-1 border rounded-xl p-3 bg-slate-50" /></div>
              <div className="col-span-2"><label className="text-xs font-bold">المرجع (يمنع التكرار)</label>
                <input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50" /></div>
            </div>
            <div className="flex gap-2 mt-5">
              <button type="submit" className="flex-1 bg-[#0f2a54] text-white py-3 rounded-xl font-bold">حفظ السند</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border py-3 rounded-xl">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* ============ نموذج إضافة حساب ============ */}
      {showAccForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={createAccount} className="bg-white rounded-2xl w-full max-w-[520px] p-6">
            <div className="flex justify-between items-center border-b pb-2 mb-3">
              <h2 className="font-extrabold text-[#0f2a54]">
                {accType === "cash" ? "💵 إضافة صندوق" : accType === "bank" ? "🏦 إضافة حساب بنكي" : "📚 إضافة حساب محاسبي"}
              </h2>
              <button type="button" onClick={() => setShowAccForm(false)} className="w-8 h-8 bg-slate-100 rounded-full">✕</button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-2 text-xs mb-3">⚠️ {error}</div>}
            <div className="space-y-2">
              <div><label className="text-xs font-bold">الاسم *</label>
                <input required value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50" /></div>
              {accType === "cash" && (
                <>
                  <div><label className="text-xs font-bold">الفرع</label>
                    <select value={accForm.branchId} onChange={e => setAccForm({ ...accForm, branchId: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50">
                      <option value="">— بدون —</option>
                      {(accounts.branches || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select></div>
                  <div><label className="text-xs font-bold">رصيد افتتاحي</label>
                    <input type="number" step="0.01" value={accForm.openingBalance} onChange={e => setAccForm({ ...accForm, openingBalance: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50" /></div>
                </>
              )}
              {accType === "bank" && (
                <>
                  <div><label className="text-xs font-bold">اسم البنك</label>
                    <input value={accForm.bankName} onChange={e => setAccForm({ ...accForm, bankName: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50" /></div>
                  <div><label className="text-xs font-bold">رقم الحساب / IBAN</label>
                    <input value={accForm.accountNumber} onChange={e => setAccForm({ ...accForm, accountNumber: e.target.value, iban: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50" /></div>
                  <div><label className="text-xs font-bold">رصيد افتتاحي</label>
                    <input type="number" step="0.01" value={accForm.openingBalance} onChange={e => setAccForm({ ...accForm, openingBalance: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50" /></div>
                </>
              )}
              {accType === "ledger" && (
                <>
                  <div><label className="text-xs font-bold">رمز الحساب *</label>
                    <input required value={accForm.code} onChange={e => setAccForm({ ...accForm, code: e.target.value })} placeholder="مثال: 1010" className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50" /></div>
                  <div><label className="text-xs font-bold">نوع الحساب *</label>
                    <select value={accForm.accType} onChange={e => setAccForm({ ...accForm, accType: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50">
                      <option value="asset">أصول</option><option value="liability">التزامات</option>
                      <option value="equity">حقوق ملكية</option><option value="revenue">إيرادات</option><option value="expense">مصروفات</option>
                    </select></div>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button type="submit" className="flex-1 bg-[#0f2a54] text-white py-2.5 rounded-xl font-bold">حفظ</button>
              <button type="button" onClick={() => setShowAccForm(false)} className="flex-1 border py-2.5 rounded-xl">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      <div id="print-vouchers" className="print-area hidden">
        <div className="text-center border-b-2 border-[#0f2a54] pb-2 mb-2">
          <div className="font-extrabold text-lg">MS للأعمال البرمجية</div>
          <div className="text-xs">سندات {voucherTypes.find(t => t.key === voucherType)?.label}</div>
        </div>
        <table className="w-full text-xs">
          <thead><tr className="bg-[#0f2a54] text-white"><th className="p-2 text-right">الرقم</th><th className="p-2 text-right">التاريخ</th><th className="p-2 text-right">البيان</th><th className="p-2 text-right">المبلغ</th></tr></thead>
          <tbody>{filtered.map(v => <tr key={v.id} className="border-t"><td className="p-2">{v.voucherNumber}</td><td className="p-2">{new Date(v.voucherDate).toLocaleDateString("ar-SA")}</td><td className="p-2">{v.description}</td><td className="p-2 font-bold">{parseFloat(v.amount).toLocaleString("ar-SA")}</td></tr>)}</tbody>
        </table>
      </div>
      <style jsx global>{`@media print { .no-print { display: none !important; } .print-area { display:block !important; } }`}</style>
    </AppShell>
  );
}

export default function FinancePage() {
  const params = useParams<{ companyId: string }>();
  return <AppShell companyId={params.companyId}><Suspense fallback={<div className="p-10 text-center">جاري التحميل...</div>}><FinanceInner /></Suspense></AppShell>;
}
