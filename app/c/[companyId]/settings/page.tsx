"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import Link from "next/link";

export default function CompanySettingsPage() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const [company, setCompany] = useState<any>(null);
  const [footer, setFooter] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [finance, setFinance] = useState<any>({ cashAccounts: [], bankAccounts: [], branches: [] });
  const [accModal, setAccModal] = useState<"" | "cash" | "bank">("");
  const [accForm, setAccForm] = useState<any>({ name: "", branchId: "", currency: "SAR", openingBalance: 0, bankName: "", accountNumber: "", iban: "" });
  const [accError, setAccError] = useState("");

  const loadFinance = () => {
    fetch(`/api/finance/accounts?companyId=${companyId}`).then(r => r.json()).then(d => {
      setFinance({ cashAccounts: d.cashAccounts || [], bankAccounts: d.bankAccounts || [], branches: d.branches || [] });
    });
  };

  useEffect(() => {
    fetch(`/api/company-settings?companyId=${companyId}`).then(r => r.json()).then(d => {
      if (d.company) { setCompany(d.company); setFooter(d.company.contractFooter || ""); }
    });
    loadFinance();
  }, [companyId]);

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccError("");
    if (!accForm.name.trim()) { setAccError("الاسم مطلوب"); return; }
    const r = await fetch("/api/finance/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, type: accModal, ...accForm }) });
    const j = await r.json();
    if (r.ok) {
      setAccModal(""); loadFinance();
      setMsg(accModal === "cash" ? "تم إضافة الصندوق بنجاح" : "تم إضافة الحساب البنكي بنجاح");
      setTimeout(() => setMsg(""), 3000);
    } else setAccError(j.error || "خطأ");
  };

  const save = async () => {
    setSaving(true);
    const r = await fetch("/api/company-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, contractFooter: footer }) });
    const j = await r.json();
    setSaving(false);
    if (r.ok) { setMsg("تم حفظ تذييل العقود بنجاح — سيظهر أسفل كل العقود المطبوعة لهذه الشركة فقط."); setTimeout(() => setMsg(""), 3000); }
    else setMsg(j.error || "خطأ");
  };

  if (!company) return <AppShell companyId={companyId}><div className="p-10 text-center">جاري التحميل...</div></AppShell>;

  return (
    <AppShell companyId={companyId}>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">إعدادات الشركة</h1>
      <p className="text-xs text-slate-500">إعدادات مستقلة لكل شركة — بيانات منفصلة تماماً</p>

      {/* ===== الحسابات المالية ===== */}
      <div className="bg-white border rounded-2xl p-5 mt-5">
        <div className="font-bold text-[#0f2a54]">💰 الحسابات المالية</div>
        <p className="text-xs text-slate-500 mt-1">أنشئ الصناديق والحسابات البنكية — تظهر في سندات القبض والصرف والقيد المحاسبي</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={() => { setAccModal("cash"); setAccForm({ name: "", branchId: "", currency: "SAR", openingBalance: 0, bankName: "", accountNumber: "", iban: "" }); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2">
            ＋ إضافة صندوق
          </button>
          <button onClick={() => { setAccModal("bank"); setAccForm({ name: "", branchId: "", currency: "SAR", openingBalance: 0, bankName: "", accountNumber: "", iban: "" }); }} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2">
            ＋ إضافة بنك
          </button>
          <Link href={`/c/${companyId}/finance`} className="bg-slate-100 hover:bg-slate-200 px-5 py-2.5 rounded-xl font-bold text-sm">📄 إدارة السندات والقيود</Link>
        </div>
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <div>
            <div className="text-xs font-bold text-slate-600 mb-1">💵 الصناديق ({finance.cashAccounts?.length || 0})</div>
            <div className="space-y-1.5">
              {(finance.cashAccounts || []).map((a: any) => (
                <div key={a.id} className="flex justify-between items-center p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-sm">
                  <span className="font-bold">{a.name}</span>
                  <span className="text-emerald-700 font-bold text-xs">{parseFloat(a.currentBalance).toLocaleString("ar-SA")} {a.currency}</span>
                </div>
              ))}
              {(finance.cashAccounts || []).length === 0 && <div className="text-xs text-slate-400 py-2">لا توجد صناديق</div>}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-600 mb-1">🏦 الحسابات البنكية ({finance.bankAccounts?.length || 0})</div>
            <div className="space-y-1.5">
              {(finance.bankAccounts || []).map((a: any) => (
                <div key={a.id} className="flex justify-between items-center p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-sm">
                  <span className="font-bold">{a.name}</span>
                  <span className="text-blue-700 font-bold text-xs">{parseFloat(a.openingBalance).toLocaleString("ar-SA")} {a.currency}</span>
                </div>
              ))}
              {(finance.bankAccounts || []).length === 0 && <div className="text-xs text-slate-400 py-2">لا توجد حسابات بنكية</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white border rounded-2xl p-5">
          <div className="font-bold">بيانات الشركة (تظهر في العقود)</div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="p-3 bg-slate-50 rounded-xl"><b>الاسم:</b> {company.name}</div>
            <div className="p-3 bg-slate-50 rounded-xl"><b>الهاتف:</b> {company.phone || "—"}</div>
            <div className="p-3 bg-slate-50 rounded-xl"><b>البريد:</b> {company.email || "—"}</div>
            <div className="p-3 bg-slate-50 rounded-xl"><b>العنوان:</b> {company.address || "—"}</div>
            <div className="text-xs text-slate-500">هذه البيانات هي التي تظهر في مستند العقد فقط — لا يُضاف اسم المنصة أو عبارة الاعتماد إلى العقود.</div>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5">
          <div className="font-bold">تذييل العقود — قابل للتخصيص لكل شركة</div>
          <p className="text-xs text-slate-500 mt-1">يظهر أسفل كل العقود المطبوعة والمصدّرة PDF لهذه الشركة فقط. اتركه فارغاً لإخفائه.</p>
          <textarea value={footer} onChange={e => setFooter(e.target.value)} rows={6} placeholder={`مثال:\n- يلتزم الطرف الثاني بتسليم العمل في الموعد المحدد...\n- طريقة الدفع: تحويل بنكي على حساب ${company.name}...\n- للتواصل: ${company.phone || "05xxxxxxxx"}`} className="w-full mt-4 border rounded-xl p-3 bg-slate-50 text-sm leading-6" />
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={saving} className="flex-1 bg-[#0f2a54] text-white py-2.5 rounded-xl font-bold">{saving ? "جاري الحفظ..." : "حفظ التذييل"}</button>
            <button onClick={() => setFooter("")} className="bg-slate-100 px-5 py-2.5 rounded-xl text-sm">مسح</button>
          </div>
          {msg && <div className="mt-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl p-3 text-xs">{msg}</div>}
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs leading-5">
            <b>تنبيه:</b> تعديل التذييل لا يحذف بيانات العقود أو الدفعات السابقة — كل العقود محفوظة كما هي، ويتغير التذييل فقط في الطباعة القادمة.
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white border rounded-2xl p-5">
        <div className="font-bold">معاينة التذييل</div>
        <div className="mt-3 border-2 border-dashed rounded-xl p-4 min-h-[80px] bg-slate-50 whitespace-pre-wrap text-sm">
          {footer ? footer : <span className="text-slate-400">لا يوجد تذييل — سيظهر سطر افتراضي باسم الشركة فقط</span>}
        </div>
        <div className="text-[11px] text-slate-400 mt-2 text-center">MS للأعمال البرمجية — إعداد وتنفيذ المهندس محمد ماجد العليمي (يظهر في واجهة النظام فقط، لا في العقود)</div>
      </div>

      {/* ===== نافذة إضافة صندوق / بنك ===== */}
      {accModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={createAccount} className="bg-white rounded-2xl w-full max-w-[520px] p-6">
            <div className="flex justify-between items-center border-b pb-2 mb-3">
              <h2 className="font-extrabold text-[#0f2a54]">{accModal === "cash" ? "💵 إضافة صندوق جديد" : "🏦 إضافة حساب بنكي جديد"}</h2>
              <button type="button" onClick={() => setAccModal("")} className="w-8 h-8 bg-slate-100 rounded-full">✕</button>
            </div>
            {accError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-2 text-xs mb-3">⚠️ {accError}</div>}
            <div className="space-y-2">
              <div><label className="text-xs font-bold">الاسم *</label>
                <input required value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} placeholder={accModal === "cash" ? "مثال: الصندوق الرئيسي" : "مثال: الحساب البنكي — الراجحي"} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50" /></div>
              {accModal === "cash" && (
                <>
                  <div><label className="text-xs font-bold">الفرع</label>
                    <select value={accForm.branchId} onChange={e => setAccForm({ ...accForm, branchId: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50">
                      <option value="">— بدون —</option>
                      {(finance.branches || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select></div>
                  <div><label className="text-xs font-bold">الرصيد الافتتاحي</label>
                    <input type="number" step="0.01" value={accForm.openingBalance} onChange={e => setAccForm({ ...accForm, openingBalance: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50" /></div>
                </>
              )}
              {accModal === "bank" && (
                <>
                  <div><label className="text-xs font-bold">اسم البنك</label>
                    <input value={accForm.bankName} onChange={e => setAccForm({ ...accForm, bankName: e.target.value })} placeholder="مثال: البنك الأهلي" className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50" /></div>
                  <div><label className="text-xs font-bold">رقم الحساب / IBAN</label>
                    <input value={accForm.accountNumber} onChange={e => setAccForm({ ...accForm, accountNumber: e.target.value, iban: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50" /></div>
                  <div><label className="text-xs font-bold">الرصيد الافتتاحي</label>
                    <input type="number" step="0.01" value={accForm.openingBalance} onChange={e => setAccForm({ ...accForm, openingBalance: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50" /></div>
                </>
              )}
              <div><label className="text-xs font-bold">العملة</label>
                <select value={accForm.currency} onChange={e => setAccForm({ ...accForm, currency: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2 bg-slate-50">
                  <option>SAR</option><option>USD</option><option>EGP</option><option>AED</option><option>KWD</option>
                </select></div>
            </div>
            <div className="flex gap-2 mt-5">
              <button type="submit" className="flex-1 bg-[#0f2a54] text-white py-2.5 rounded-xl font-bold">حفظ</button>
              <button type="button" onClick={() => setAccModal("")} className="flex-1 border py-2.5 rounded-xl">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
