"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { AppShell } from "@/components/Shell";
import { useParams } from "next/navigation";
import { printHTML, printElement } from "@/lib/print";
import { buildSalesInvoiceHTML, loadTemplate, DEFAULT_SALES_TEMPLATE, TEMPLATE_KEYS, type SalesTemplateConfig } from "@/lib/templates";

type Item = { productId: string; productName: string; quantity: number; unitPrice: number; taxInclusive: boolean; taxRate: number };

export default function InvoicesPage() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<Record<string, any[]>>({});
  const [custMap, setCustMap] = useState<Record<string, any>>({});
  const [salesTpl, setSalesTpl] = useState<SalesTemplateConfig>(DEFAULT_SALES_TEMPLATE);
  const [show, setShow] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCust, setNewCust] = useState<any>({ name: "", phone: "", email: "", address: "", taxNumber: "" });
  const [newCustSubmitting, setNewCustSubmitting] = useState(false);
  const [custError, setCustError] = useState("");
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const [form, setForm] = useState<any>({
    customerId: "", taxRate: 15, taxEnabled: true, taxInclusive: false,
    discount: 0, notes: "", dueDate: "", status: "draft",
    items: [] as Item[],
  });

  const load = () => {
    fetch(`/api/invoices?companyId=${companyId}`).then(r => r.json()).then(async d => {
      const list = d.invoices || [];
      setInvoices(list);
      const itemsMap: Record<string, any[]> = {};
      await Promise.all(list.slice(0, 40).map(async (inv: any) => {
        try {
          const r = await fetch(`/api/invoices/${inv.id}`);
          if (r.ok) { const j = await r.json(); itemsMap[inv.id] = j.items || []; }
        } catch {}
      }));
      setInvoiceItems(itemsMap);
    });
    fetch(`/api/customers?companyId=${companyId}`).then(r => r.json()).then(d => {
      const list = d.customers || [];
      setCustomers(list);
      const m: Record<string, any> = {};
      list.forEach((c: any) => { m[c.id] = c; });
      setCustMap(m);
    });
    fetch(`/api/products?companyId=${companyId}`).then(r => r.json()).then(d => setProducts(d.products || []));
    fetch(`/api/company-settings?companyId=${companyId}`).then(r => r.json()).then(d => { if (d.company) setCompanyInfo(d.company); });
  };
  useEffect(() => { load(); }, [companyId]);
  useEffect(() => { setSalesTpl(loadTemplate(TEMPLATE_KEYS.sales(companyId), DEFAULT_SALES_TEMPLATE)); }, [companyId]);

  // ===== الحسابات التلقائية =====
  const totals = useMemo(() => {
    let subtotal = 0; // مجموع قبل الضريبة
    let taxTotal = 0;
    for (const it of form.items as Item[]) {
      const line = it.quantity * it.unitPrice;
      if (it.taxInclusive) {
        // السعر شامل الضريبة — نستخرج الضريبة
        const t = line - (line / (1 + it.taxRate / 100));
        subtotal += line - t;
        taxTotal += t;
      } else {
        subtotal += line;
        taxTotal += line * (it.taxRate / 100);
      }
    }
    const disc = parseFloat(form.discount || 0);
    const netBeforeTax = Math.max(0, subtotal - disc);
    const tax = form.taxEnabled ? Math.round(taxTotal * 100) / 100 : 0;
    const total = Math.round((netBeforeTax + tax) * 100) / 100;
    const paid = parseFloat(paidAmount || "0");
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: disc,
      netBeforeTax: Math.round(netBeforeTax * 100) / 100,
      tax,
      total,
      paid,
      remaining: Math.max(0, Math.round((total - paid) * 100) / 100),
    };
  }, [form.items, form.discount, form.taxEnabled, paidAmount]);

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: "", productName: "", quantity: 1, unitPrice: 0, taxInclusive: form.taxInclusive, taxRate: form.taxRate }] });

  const updateItem = (i: number, field: string, v: any) => {
    const items = [...form.items];
    (items[i] as any)[field] = v;
    if (field === "productId") {
      const p = products.find(x => x.id === v);
      if (p) {
        items[i].productName = p.name;
        items[i].unitPrice = parseFloat(p.price);
        items[i].taxRate = parseFloat(p.taxRate || form.taxRate);
      }
    }
    setForm({ ...form, items });
  };

  const addNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCustSubmitting) return;
    setCustError("");
    if (!newCust.name || newCust.name.trim().length < 2) { setCustError("اسم العميل مطلوب (حرفان على الأقل)"); return; }
    if (newCust.phone && !/^[\d\s+\-()]{4,}$/.test(newCust.phone)) { setCustError("رقم هاتف غير صالح"); return; }
    setNewCustSubmitting(true);
    try {
      const r = await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, ...newCust }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "فشل إضافة العميل");
      const refreshed = await fetch(`/api/customers?companyId=${companyId}`).then(r => r.json());
      const list = refreshed.customers || [];
      setCustomers(list);
      const m: Record<string, any> = {};
      list.forEach((c: any) => { m[c.id] = c; });
      setCustMap(m);
      setForm({ ...form, customerId: j.customer.id });
      setShowNewCustomer(false);
      setNewCust({ name: "", phone: "", email: "", address: "", taxNumber: "" });
    } catch (e: any) {
      setCustError(e.message);
    } finally {
      setNewCustSubmitting(false);
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current || submitting) return;
    setError("");
    if (form.items.length === 0) { setError("أضف بنداً واحداً على الأقل"); return; }
    for (const it of form.items) {
      if (!it.productName.trim()) { setError("كل بند يحتاج اسم صنف"); return; }
      if (!it.quantity || it.quantity <= 0) { setError("كل بند يحتاج كمية أكبر من صفر"); return; }
      if (it.unitPrice < 0) { setError("السعر لا يكون سالباً"); return; }
    }
    if (form.taxRate < 0 || form.taxRate > 100) { setError("نسبة الضريبة بين 0 و 100"); return; }
    submitLock.current = true;
    setSubmitting(true);
    try {
      const payload: any = {
        companyId, customerId: form.customerId || null,
        taxRate: form.taxRate, taxEnabled: form.taxEnabled,
        taxInclusive: form.taxInclusive,
        discount: parseFloat(form.discount || 0),
        notes: form.notes, dueDate: form.dueDate || null,
        status: form.status,
        paymentMethod, paidAmount: totals.paid,
        items: (form.items as Item[]).map((it: Item) => ({
          productId: it.productId || null, productName: it.productName,
          quantity: it.quantity, unitPrice: it.unitPrice,
          taxInclusive: it.taxInclusive, taxRate: it.taxRate,
        })),
      };
      const r = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "فشل حفظ الفاتورة");
      setShow(false);
      setForm({ customerId: "", taxRate: 15, taxEnabled: true, taxInclusive: false, discount: 0, notes: "", dueDate: "", status: "draft", items: [] });
      setPaidAmount(""); setPaymentMethod("cash");
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
      setTimeout(() => { submitLock.current = false; }, 1500);
    }
  };

  const printInvoice = (inv: any) => {
    const cust = inv.customerId ? (custMap[inv.customerId] || customers.find(c => c.id === inv.customerId)) : null;
    const html = buildSalesInvoiceHTML({
      company: companyInfo || { name: "الشركة" }, tpl: salesTpl, invoice: inv,
      customer: cust, items: invoiceItems[inv.id] || [],
    });
    printHTML(html, { title: `فاتورة ${inv.invoiceNumber}`, paper: salesTpl.paper, orientation: salesTpl.orientation });
  };

  return (
    <AppShell companyId={companyId}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f2a54]">شاشة المبيعات</h1>
          <p className="text-xs text-slate-500">فاتورة جديدة بعرض عريض • الكمية • السعر شامل الضريبة • طريقة الدفع • الإجماليات التلقائية</p>
        </div>
        <div className="flex gap-2">
          <a href={`/c/${companyId}/invoice-template`} className="bg-white border px-4 py-2.5 rounded-xl text-sm font-medium">⚙️ قالب الفاتورة</a>
          <button onClick={() => setShow(true)} className="bg-[#0f2a54] text-white px-6 py-2.5 rounded-xl font-bold">+ فاتورة جديدة</button>
        </div>
      </div>

      {/* ===== الإحصائيات ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">عدد الفواتير</div><div className="text-xl font-black">{invoices.length}</div></div>
        <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">إجمالي المبيعات</div><div className="text-xl font-black text-emerald-600">{invoices.filter(i => i.type === "sale").reduce((a, b) => a + parseFloat(b.total), 0).toLocaleString("ar-SA")}</div></div>
        <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">إجمالي المشتريات</div><div className="text-xl font-black text-amber-600">{invoices.filter(i => i.type === "purchase").reduce((a, b) => a + parseFloat(b.total), 0).toLocaleString("ar-SA")}</div></div>
        <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">غير المحصّل</div><div className="text-xl font-black text-red-600">{invoices.filter(i => i.type === "sale").reduce((a, b) => a + Math.max(0, parseFloat(b.total) - parseFloat(b.paidAmount || 0)), 0).toLocaleString("ar-SA")}</div></div>
      </div>

      {/* ===== جدول الفواتير ===== */}
      <div className="bg-white border rounded-2xl p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold">📋 سجل الفواتير</div>
          <div className="flex gap-2 no-print">
            <button onClick={() => {
              const csv = "رقم الفاتورة,العميل,النوع,المبلغ,الضريبة,المدفوع,التاريخ\n" + invoices.map(i => `${i.invoiceNumber},${custMap[i.customerId]?.name || ""},${i.type},${i.total},${i.taxAmount},${i.paidAmount},${new Date(i.createdAt).toLocaleDateString("ar-SA")}`).join("\n");
              const b = new Blob(["\ufeff" + csv], { type: "text/csv" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "invoices.csv"; a.click();
            }} className="bg-white border px-4 py-2 rounded-xl text-sm">📥 تصدير CSV</button>
            <button onClick={() => printElement("print-invoices-table", { title: "تقرير الفواتير", paper: "A4", orientation: "landscape" })} className="bg-white border px-4 py-2 rounded-xl text-sm">🖨️ طباعة التقرير</button>
          </div>
        </div>
        <div className="overflow-auto" id="print-invoices-table">
          <div className="mb-3 pb-2 border-b-2 border-[#0f2a54] hidden print:block">
            <div className="font-extrabold text-lg">تقرير الفواتير — {companyInfo?.name}</div>
            <div className="text-xs">عدد الفواتير: {invoices.length} • إجمالي المبيعات: {invoices.filter(i => i.type === "sale").reduce((a, b) => a + parseFloat(b.total), 0).toLocaleString("ar-SA")} SAR</div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-slate-600">
              <th className="p-3 text-right">رقم الفاتورة</th><th className="p-3 text-right">العميل</th><th className="p-3 text-right">النوع</th>
              <th className="p-3 text-right">التاريخ</th><th className="p-3 text-right">قبل الضريبة</th><th className="p-3 text-right">الضريبة</th>
              <th className="p-3 text-right">الإجمالي</th><th className="p-3 text-right">المدفوع</th><th className="p-3 text-right">المتبقي</th>
              <th className="p-3 text-right">الحالة</th><th className="p-3 text-right no-print">إجراءات</th>
            </tr></thead>
            <tbody>
              {invoices.map(inv => {
                const net = parseFloat(inv.total) - parseFloat(inv.taxAmount || 0);
                const paid = parseFloat(inv.paidAmount || 0);
                return (
                  <tr key={inv.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-[#0f2a54]">{inv.invoiceNumber}</td>
                    <td className="p-3 text-xs font-medium">{custMap[inv.customerId]?.name || "عميل نقدي"}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${inv.type === "sale" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{inv.type === "sale" ? "مبيعات" : "مشتريات"}</span></td>
                    <td className="p-3 text-xs">{new Date(inv.createdAt).toLocaleDateString("ar-SA")}</td>
                    <td className="p-3 text-xs">{net.toLocaleString("ar-SA")}</td>
                    <td className="p-3 text-xs text-amber-600">{parseFloat(inv.taxAmount || 0).toLocaleString("ar-SA")}</td>
                    <td className="p-3 font-bold">{parseFloat(inv.total).toLocaleString("ar-SA")} {inv.currency}</td>
                    <td className="p-3 text-xs text-emerald-600">{paid.toLocaleString("ar-SA")}</td>
                    <td className="p-3 text-xs font-bold text-red-600">{(parseFloat(inv.total) - paid).toLocaleString("ar-SA")}</td>
                    <td className="p-3"><span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{inv.status === "paid" ? "مدفوعة" : inv.status === "sent" ? "مستحقة" : inv.status === "draft" ? "مسودة" : inv.status}</span></td>
                    <td className="p-3 flex gap-1 flex-wrap no-print">
                      <button onClick={() => printInvoice(inv)} className="text-xs bg-white border px-3 py-1 rounded-full">🖨️ طباعة</button>
                      <a href={`/c/${companyId}/contracts/new?invoiceId=${inv.id}&customerId=${inv.customerId || ""}`} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full font-bold">📄 عقد</a>
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 && <tr><td colSpan={11} className="p-8 text-center text-slate-400">لا توجد فواتير — اضغط "فاتورة جديدة" للبدء</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== نموذج الفاتورة الجديدة ===== */}
      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-3 overflow-auto">
          <form onSubmit={create} className="bg-white rounded-2xl w-full max-w-[1400px] p-5 my-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="font-extrabold text-[#0f2a54] text-lg">فاتورة بيع جديدة</h2>
                <p className="text-xs text-slate-500">الحسابات تُحدَّث تلقائياً • السعر شامل/غير شامل الضريبة • الإجمالي النهائي</p>
              </div>
              <button type="button" onClick={() => setShow(false)} className="w-9 h-9 bg-slate-100 rounded-full text-lg">✕</button>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mt-3">⚠️ {error}</div>}

            {/* شريط علوي */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-4">
              <div className="col-span-2">
                <label className="text-xs font-bold">العميل</label>
                <div className="flex gap-1 mt-1">
                  <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className="flex-1 border rounded-xl px-3 py-2.5 bg-slate-50 text-sm">
                    <option value="">عميل نقدي</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowNewCustomer(true)} className="bg-[#0f2a54] text-white px-3 rounded-xl text-sm font-bold whitespace-nowrap" title="إضافة عميل جديد">+ عميل</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold">نسبة الضريبة %</label>
                <input type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })} className="w-full mt-1 border rounded-xl px-3 py-2.5 bg-slate-50 text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold">الخصم</label>
                <input type="number" step="0.01" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} className="w-full mt-1 border rounded-xl px-3 py-2.5 bg-slate-50 text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold">طريقة الدفع</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full mt-1 border rounded-xl px-3 py-2.5 bg-slate-50 text-sm">
                  <option value="cash">نقدي</option><option value="card">بطاقة</option>
                  <option value="transfer">تحويل بنكي</option><option value="credit">آجل (على الحساب)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold">المبلغ المدفوع</label>
                <input type="number" step="0.01" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className="w-full mt-1 border rounded-xl px-3 py-2.5 bg-slate-50 text-sm" />
              </div>
            </div>

            {/* خيارات الضريبة */}
            <div className="flex flex-wrap gap-4 mt-3 bg-slate-50 rounded-xl p-3">
              <label className="flex items-center gap-2 text-xs font-medium">
                <input type="checkbox" checked={form.taxEnabled} onChange={e => setForm({ ...form, taxEnabled: e.target.checked })} />
                تفعيل الضريبة
              </label>
              <label className="flex items-center gap-2 text-xs font-medium">
                <input type="checkbox" checked={form.taxInclusive} onChange={e => setForm({ ...form, taxInclusive: e.target.checked })} />
                الأسعار <b>شاملة الضريبة</b>
              </label>
              {!form.taxInclusive && (
                <label className="flex items-center gap-2 text-xs font-medium">
                    <input type="checkbox" checked={true} readOnly /> الأسعار <b>غير شاملة الضريبة</b>
                </label>
              )}
              <div className="flex items-center gap-2 text-xs">
                <label>تاريخ الاستحقاق</label>
                <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="border rounded-lg px-2 py-1" />
              </div>
            </div>

            {/* ===== جدول الأصناف — عريض ===== */}
            <div className="mt-4 border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0f2a54] text-white text-xs">
                    <th className="p-2 text-right w-8">#</th>
                    <th className="p-2 text-right">الصنف / المنتج</th>
                    <th className="p-2 text-right w-44">اسم البند</th>
                    <th className="p-2 text-center w-24">الكمية</th>
                    <th className="p-2 text-center w-28">سعر الوحدة</th>
                    <th className="p-2 text-center w-24">الضريبة %</th>
                    <th className="p-2 text-center w-28">خصم البند</th>
                    <th className="p-2 text-center w-32">الإجمالي</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((it: any, idx: number) => {
                    const line = it.quantity * it.unitPrice;
                    const lineTax = it.taxInclusive ? line - (line / (1 + it.taxRate / 100)) : line * (it.taxRate / 100);
                    return (
                      <tr key={idx} className="border-b bg-white hover:bg-slate-50">
                        <td className="p-2 text-center text-xs text-slate-400">{idx + 1}</td>
                        <td className="p-2">
                          <select value={it.productId} onChange={e => updateItem(idx, "productId", e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-xs bg-slate-50">
                            <option value="">— اختر منتج —</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="p-2"><input value={it.productName} onChange={e => updateItem(idx, "productName", e.target.value)} placeholder="اسم الصنف" className="w-full border rounded-lg px-2 py-1.5 text-xs" /></td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => updateItem(idx, "quantity", Math.max(1, (it.quantity || 1) - 1))} className="w-6 h-7 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold">−</button>
                            <input type="number" min="0" step="0.01" value={it.quantity} onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} className="w-14 border rounded-lg px-1 py-1.5 text-center text-xs font-bold" />
                            <button type="button" onClick={() => updateItem(idx, "quantity", (it.quantity || 0) + 1)} className="w-6 h-7 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold">+</button>
                          </div>
                        </td>
                        <td className="p-2"><input type="number" min="0" step="0.01" value={it.unitPrice} onChange={e => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} className="w-full border rounded-lg px-2 py-1.5 text-center text-xs font-bold" /></td>
                        <td className="p-2"><input type="number" min="0" max="100" step="0.01" value={it.taxRate} onChange={e => updateItem(idx, "taxRate", parseFloat(e.target.value) || 0)} className="w-full border rounded-lg px-2 py-1.5 text-center text-xs" /></td>
                        <td className="p-2"><input type="number" min="0" step="0.01" value={it.discount || 0} onChange={e => updateItem(idx, "discount", parseFloat(e.target.value) || 0)} className="w-full border rounded-lg px-2 py-1.5 text-center text-xs" /></td>
                        <td className="p-2 text-center text-xs font-bold text-[#0f2a54]">{(line - (it.discount || 0)).toLocaleString("ar-SA")}</td>
                        <td className="p-2 text-center">
                          <button type="button" onClick={() => setForm({ ...form, items: form.items.filter((_: any, i: number) => i !== idx) })} className="text-red-500 text-xs">✕</button>
                        </td>
                      </tr>
                    );
                  })}
                  {form.items.length === 0 && (
                    <tr><td colSpan={9} className="p-8 text-center text-slate-400">اضغط "+ إضافة بند" لإضافة أصناف الفاتورة</td></tr>
                  )}
                </tbody>
              </table>
              <div className="p-2 bg-slate-50 border-t">
                <button type="button" onClick={addItem} className="text-sm bg-white border px-4 py-2 rounded-xl font-bold">+ إضافة بند</button>
              </div>
            </div>

            {/* ===== الملخصات ===== */}
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div className="md:col-span-2">
                <label className="text-xs font-bold">ملاحظات الفاتورة</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات تظهر في الفاتورة المطبوعة" className="w-full mt-1 border rounded-xl p-3 bg-slate-50 text-sm" rows={4} />
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs font-bold">الحالة</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="border rounded-xl px-3 py-2 bg-slate-50 text-sm">
                    <option value="draft">مسودة</option>
                    <option value="sent">مستحقة</option>
                    <option value="paid">مدفوعة</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 border rounded-2xl p-4">
                <div className="font-bold text-sm mb-2">💰 ملخص الفاتورة</div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span>المجموع قبل الضريبة</span><b>{totals.subtotal.toLocaleString("ar-SA")}</b></div>
                  {totals.discount > 0 && <div className="flex justify-between text-red-600"><span>الخصم</span><b>-{totals.discount.toLocaleString("ar-SA")}</b></div>}
                  <div className="flex justify-between text-amber-600"><span>الضريبة ({form.taxRate}%)</span><b>{totals.tax.toLocaleString("ar-SA")}</b></div>
                  <div className="flex justify-between border-t pt-2 text-base font-black text-[#0f2a54]"><span>الإجمالي شامل الضريبة</span><span>{totals.total.toLocaleString("ar-SA")} SAR</span></div>
                  <div className="flex justify-between text-emerald-600"><span>المدفوع ({paymentMethod === "cash" ? "نقدي" : paymentMethod === "card" ? "بطاقة" : paymentMethod === "transfer" ? "تحويل" : "آجل"})</span><b>{totals.paid.toLocaleString("ar-SA")}</b></div>
                  {totals.remaining > 0 && <div className="flex justify-between text-red-600 font-bold"><span>المتبقي</span><b>{totals.remaining.toLocaleString("ar-SA")}</b></div>}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5 border-t pt-4">
              <button disabled={submitting || form.items.length === 0} type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-base">
                {submitting ? "جاري الحفظ..." : `حفظ الفاتورة — ${totals.total.toLocaleString("ar-SA")} SAR`}
              </button>
              <button type="button" onClick={() => setShow(false)} className="px-6 py-3 rounded-xl border">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* ===== نافذة إضافة عميل سريع ===== */}
      {showNewCustomer && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <form onSubmit={addNewCustomer} className="bg-white rounded-2xl w-full max-w-[520px] p-6">
            <div className="flex justify-between items-center border-b pb-2 mb-3">
              <h2 className="font-extrabold text-[#0f2a54]">➕ إضافة عميل جديد</h2>
              <button type="button" onClick={() => setShowNewCustomer(false)} className="w-8 h-8 bg-slate-100 rounded-full">✕</button>
            </div>
            <p className="text-xs text-slate-500 mb-3">سيُضاف لقائمة العملاء ويُحدَّد تلقائياً في الفاتورة — دون فقدان بنود الفاتورة</p>
            {custError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-2 text-xs mb-3">⚠️ {custError}</div>}
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="اسم العميل *" value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} className="col-span-2 border rounded-xl px-3 py-2.5 bg-slate-50" autoFocus />
              <input placeholder="رقم الهاتف" value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input placeholder="البريد الإلكتروني" type="email" value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input placeholder="الرقم الضريبي" value={newCust.taxNumber} onChange={e => setNewCust({ ...newCust, taxNumber: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input placeholder="العنوان" value={newCust.address} onChange={e => setNewCust({ ...newCust, address: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" disabled={newCustSubmitting} className="flex-1 bg-[#0f2a54] text-white py-2.5 rounded-xl font-bold disabled:opacity-50">{newCustSubmitting ? "جاري الحفظ..." : "حفظ وتحديد العميل"}</button>
              <button type="button" onClick={() => setShowNewCustomer(false)} className="flex-1 border py-2.5 rounded-xl">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
