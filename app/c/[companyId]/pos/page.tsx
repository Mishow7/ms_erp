"use client";
import { useEffect, useState, Suspense, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import { printHTML } from "@/lib/print";
import { buildPosReceiptHTML, loadTemplate, DEFAULT_POS_TEMPLATE, TEMPLATE_KEYS, type PosTemplateConfig } from "@/lib/templates";

function POSInner() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const router = useRouter();
  const [setup, setSetup] = useState<any>(null);
  const [shift, setShift] = useState<any>(null);
  const [register, setRegister] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [taxRate, setTaxRate] = useState(15);
  const [taxMode, setTaxMode] = useState<"exclusive" | "inclusive">("exclusive");
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [payments, setPayments] = useState<{ method: string; amount: string; reference?: string }[]>([{ method: "cash", amount: "" }]);
  const [openingCash, setOpeningCash] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [posTpl, setPosTpl] = useState<PosTemplateConfig>(DEFAULT_POS_TEMPLATE);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCust, setNewCust] = useState<any>({ name: "", phone: "", email: "", address: "", taxNumber: "", notes: "" });
  const [newCustSubmitting, setNewCustSubmitting] = useState(false);
  const [newCustError, setNewCustError] = useState("");
  const submitLockRef = useRef(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    try {
      const r = await fetch(`/api/pos/setup?companyId=${companyId}`, { credentials: "include" });
      const d = await r.json();
      setSetup(d);
      setPosTpl(loadTemplate(TEMPLATE_KEYS.pos(companyId), DEFAULT_POS_TEMPLATE));
      const sr = await fetch(`/api/pos/shifts?companyId=${companyId}`, { credentials: "include" });
      const sd = await sr.json();
      const me = await fetch("/api/auth/me", { credentials: "include" }).then(r => r.json());
      const myOpen = (sd.shifts || []).find((s: any) => s.status === "open" && s.userName === me.user?.name);
      if (myOpen) setShift(myOpen);
      // load company settings
      const settingsRes = await fetch(`/api/pos/settings?companyId=${companyId}`, { credentials: "include" });
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        if (s.settings) {
          if (s.settings.defaultTaxRate !== undefined) setTaxRate(parseFloat(s.settings.defaultTaxRate));
          if (s.settings.taxMode) setTaxMode(s.settings.taxMode);
          if (s.settings.taxEnabled !== undefined) setTaxEnabled(s.settings.taxEnabled);
        }
      }
    } catch (e) {
      console.error("load error", e);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const filteredProducts = useMemo(() =>
    (setup?.products || []).filter((p: any) =>
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode === search
    ), [setup?.products, search]);

  const addToCart = (p: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.productId === p.id);
      if (existing) return prev.map(c => c.productId === p.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { productId: p.id, productName: p.name, quantity: 1, unitPrice: parseFloat(p.price), discount: 0 }];
    });
  };
  const updateQty = (i: number, qty: number) => setCart(prev => {
    if (qty < 1) return prev.filter((_, idx) => idx !== i);
    return prev.map((c, idx) => idx === i ? { ...c, quantity: qty } : c);
  });
  const updatePrice = (i: number, price: number) => setCart(prev => prev.map((c, idx) => idx === i ? { ...c, unitPrice: Math.max(0, price) } : c));
  const updateItemDiscount = (i: number, d: number) => setCart(prev => prev.map((c, idx) => idx === i ? { ...c, discount: Math.max(0, d) } : c));
  const removeItem = (i: number) => setCart(prev => prev.filter((_, idx) => idx !== i));
  const clearCart = () => { setCart([]); setCustomerId(""); setDiscount(0); setPayments([{ method: "cash", amount: "" }]); };

  // حسابات الإجمالي - شامل الضريبة
  const calcTotals = useMemo(() => {
    const subtotal = cart.reduce((a, c) => a + c.unitPrice * c.quantity, 0);
    const itemDiscounts = cart.reduce((a, c) => a + (c.discount || 0), 0);
    const totalDiscount = itemDiscounts + (discount || 0);
    const netBeforeTax = Math.max(0, subtotal - totalDiscount);
    let tax = 0;
    let total = netBeforeTax;
    if (taxEnabled) {
      if (taxMode === "inclusive") {
        // الأسعار شاملة الضريبة — نستخرج الضريبة من الإجمالي
        tax = netBeforeTax - (netBeforeTax / (1 + taxRate / 100));
        total = netBeforeTax;
      } else {
        // exclusive — نضيف الضريبة
        tax = netBeforeTax * (taxRate / 100);
        total = netBeforeTax + tax;
      }
    }
    return {
      subtotal,
      itemDiscounts,
      extraDiscount: discount || 0,
      totalDiscount,
      netBeforeTax: Math.round(netBeforeTax * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }, [cart, discount, taxRate, taxMode, taxEnabled]);

  const paidTotal = payments.reduce((a, p) => a + parseFloat(p.amount || "0"), 0);
  const creditPayments = payments.filter(p => p.method === "credit");
  const cashPayments = paidTotal - creditPayments.reduce((a, p) => a + parseFloat(p.amount || "0"), 0);
  const remaining = Math.max(0, calcTotals.total - paidTotal);

  const openShift = async () => {
    if (!register) { alert("لا يوجد صندوق متاح"); return; }
    setSubmitting(true);
    try {
      const r = await fetch("/api/pos/shifts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registerId: register.id, openingCash: parseFloat(openingCash) || 0 }) });
      const j = await r.json();
      if (r.ok) { setShift(j.shift); }
      else alert(j.error || "فشل فتح الوردية");
    } finally { setSubmitting(false); }
  };

  const addNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCustSubmitting) return;
    setNewCustError("");
    if (!newCust.name || newCust.name.trim().length < 2) { setNewCustError("اسم العميل مطلوب (حرفان على الأقل)"); return; }
    if (newCust.phone && !/^[\d\s+\-()]{4,}$/.test(newCust.phone)) { setNewCustError("رقم هاتف غير صالح"); return; }
    setNewCustSubmitting(true);
    try {
      const r = await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, ...newCust }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "فشل إضافة العميل");
      // refresh list and select
      const refreshed = await fetch(`/api/pos/setup?companyId=${companyId}`).then(r => r.json());
      setSetup(refreshed);
      setCustomerId(j.customer.id);
      setShowNewCustomer(false);
      setNewCust({ name: "", phone: "", email: "", address: "", taxNumber: "", notes: "" });
    } catch (e: any) {
      setNewCustError(e.message);
    } finally {
      setNewCustSubmitting(false);
    }
  };

  const printCurrentInvoice = () => {
    if (cart.length === 0) return;
    const cust = (setup.customers || []).find((c: any) => c.id === customerId);
    const paidTotal = payments.reduce((a, p) => a + parseFloat(p.amount || "0"), 0);
    const html = buildPosReceiptHTML({
      company: setup?.company || { name: "الشركة" },
      tpl: posTpl,
      receiptNumber: "POS-" + new Date().getFullYear() + "-معاينة",
      date: new Date().toLocaleString("ar-SA"),
      customerName: cust?.name || null,
      customerPhone: cust?.phone || null,
      items: cart.map(c => ({
        productName: c.productName,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        discount: c.discount || 0,
        total: (c.unitPrice * c.quantity) - (c.discount || 0),
      })),
      subtotal: calcTotals.subtotal,
      discount: calcTotals.totalDiscount,
      taxRate, taxAmount: calcTotals.tax, total: calcTotals.total,
      paid: paidTotal, change: Math.max(0, paidTotal - calcTotals.total),
      payments: payments.map(p => ({ method: p.method, amount: parseFloat(p.amount || "0") })),
      currency: setup?.company?.currency || "SAR",
    });
    printHTML(html, { title: "فاتورة نقطة البيع", paper: posTpl.paper === "A4" ? "A4" : "receipt" });
  };

  const completeSale = async () => {
    if (submitLockRef.current || submitting) return;
    if (cart.length === 0) return;
    if (paidTotal < calcTotals.total - 0.001) { alert(`المبلغ المستلم (${paidTotal.toFixed(2)}) أقل من الإجمالي (${calcTotals.total.toFixed(2)})`); return; }
    if (creditPayments.length > 0 && !customerId) {
      // check company setting: allow cash customer credit?
      const allowCashCredit = setup?.settings?.allowCashCustomerCredit;
      if (!allowCashCredit) { alert("البيع الآجل يتطلب اختيار عميل"); return; }
    }
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const payload: any = {
        shiftId: shift.id,
        customerId: customerId || null,
        items: cart.map(c => ({ productId: c.productId, productName: c.productName, quantity: c.quantity, unitPrice: c.unitPrice, discount: c.discount || 0 })),
        payments,
        discount: discount || 0,
        taxRate,
        taxMode,
        taxEnabled,
      };
      const r = await fetch("/api/pos/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "فشل حفظ الفاتورة");
      // جلب الفاتورة كاملة من الخادم للتأكد
      const fetched = await fetch(`/api/pos/sales/${j.sale.id}`).then(r => r.json()).catch(() => null);
      setLastInvoice({ ...j.sale, invoice: j.invoiceId ? { id: j.invoiceId } : null, items: j.items || [] });
      setShowSuccess(true);
      clearCart();
    } catch (e: any) {
      alert("فشل حفظ الفاتورة: " + (e?.message || "خطأ غير معروف"));
    } finally {
      setSubmitting(false);
      setTimeout(() => { submitLockRef.current = false; }, 2000);
    }
  };

  if (!setup) return <AppShell companyId={companyId}><div className="p-10 text-center">جاري التحميل...</div></AppShell>;

  if ((setup.registers || []).length === 0) {
    return <AppShell companyId={companyId}>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">نقاط البيع</h1>
      <div className="mt-4 bg-white border rounded-2xl p-6 text-center">
        <div className="text-5xl mb-3">🛒</div>
        <div className="font-bold">لا يوجد صندوق مسجل</div>
        <div className="text-sm text-slate-500 mt-1">أنشئ صندوقاً مرتبطاً بفرع ومستودع للبدء</div>
        <RegisterCreator companyId={companyId} branches={setup.branches} warehouses={setup.warehouses} onCreated={load} />
      </div>
    </AppShell>;
  }

  if (!shift) {
    return <AppShell companyId={companyId}>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">نقاط البيع</h1>
      <div className="mt-4 bg-white border rounded-2xl p-6 max-w-[500px] mx-auto">
        <div className="text-center">
          <div className="text-5xl mb-3">🕐</div>
          <div className="font-bold text-lg">فتح وردية جديدة</div>
          <div className="text-sm text-slate-500 mt-1 mb-4">حدد الصندوق ورصيد بداية النقد</div>
        </div>
        <select value={register?.id || ""} onChange={e => setRegister(setup.registers.find((r: any) => r.id === e.target.value))} className="w-full border rounded-xl px-3 py-2.5 bg-slate-50 mb-3">
          <option value="">اختر الصندوق</option>
          {setup.registers.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <input type="number" value={openingCash} onChange={e => setOpeningCash(e.target.value)} placeholder="رصيد بداية النقد" className="w-full border rounded-xl px-3 py-2.5 bg-slate-50 mb-3" />
        <button onClick={openShift} disabled={submitting} className="w-full bg-[#0f2a54] text-white py-3 rounded-xl font-bold disabled:opacity-50">{submitting ? "..." : "فتح الوردية"}</button>
        <div className="mt-3 text-center">
          <a href={`/c/${companyId}/pos-shifts`} className="text-xs text-blue-600 hover:underline">إدارة كل الورديات ←</a>
        </div>
      </div>
    </AppShell>;
  }

  return (
    <AppShell companyId={companyId}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-[#0f2a54]">نقاط البيع</h1>
          <p className="text-xs text-slate-500">وردية مفتوحة — رصيد بداية {parseFloat(shift.openingCash).toLocaleString("ar-SA")} SAR — {shift.userName}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={`/c/${companyId}/pos-shifts`} className="bg-white border px-3 py-2 rounded-xl text-sm">📋 الورديات</a>
          <a href={`/c/${companyId}/invoice-template`} className="bg-white border px-3 py-2 rounded-xl text-sm">⚙️ قالب الطباعة</a>
          <button onClick={() => { if (confirm("إغلاق الوردية؟")) router.push(`/c/${companyId}/pos-shifts?id=${shift.id}`); }} className="bg-white border px-3 py-2 rounded-xl text-sm">إغلاق الوردية</button>
        </div>
      </div>

      {showSuccess && lastInvoice && (
        <div className="mt-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-emerald-800 font-bold text-lg">✓ تم حفظ الفاتورة بنجاح</div>
            <div className="text-sm text-emerald-700">رقم الإيصال: <b className="font-mono">{lastInvoice.receiptNumber}</b> — الإجمالي: <b>{parseFloat(lastInvoice.total).toLocaleString("ar-SA")} SAR</b></div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a href={`/c/${companyId}/pos/receipt/${lastInvoice.id}`} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold">🖨️ عرض وطباعة الإيصال</a>
            <a href={`/c/${companyId}/pos-sales`} className="bg-white border px-4 py-2 rounded-xl text-sm">📋 قائمة المبيعات</a>
            <button onClick={() => setShowSuccess(false)} className="bg-slate-100 px-3 py-2 rounded-xl text-sm">✕ إغلاق</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 mt-4">
        <div className="col-span-12 lg:col-span-7 bg-white border rounded-2xl p-4">
          <div className="flex gap-2 mb-3">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الباركود أو SKU..." className="flex-1 border rounded-xl px-4 py-2.5 bg-slate-50" autoFocus />
            {search && <button onClick={() => setSearch("")} className="px-3 bg-slate-100 rounded-xl">✕</button>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[500px] overflow-auto">
            {filteredProducts.slice(0, 60).map((p: any) => (
              <button key={p.id} onClick={() => addToCart(p)} className="border rounded-xl p-3 text-right hover:bg-blue-50 hover:border-[#0f2a54]">
                <div className="text-2xl">📦</div>
                <div className="text-xs font-bold mt-1 truncate">{p.name}</div>
                <div className="text-[11px] text-slate-500">{p.sku || "—"}</div>
                <div className="text-sm font-black text-[#0f2a54] mt-1">{parseFloat(p.price).toLocaleString("ar-SA")}</div>
                <div className="text-[10px]">المخزون: {p.stock}</div>
              </button>
            ))}
            {filteredProducts.length === 0 && <div className="col-span-3 text-center text-slate-400 py-10 text-sm">لا توجد نتائج</div>}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 bg-white border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold">🛒 الفاتورة الحالية</div>
            {cart.length > 0 && <button onClick={clearCart} className="text-xs text-red-600">إفراغ</button>}
          </div>
          <div className="max-h-[200px] overflow-auto">
            {cart.length === 0 && <div className="text-center text-slate-400 py-10 text-sm">السلة فارغة</div>}
            {cart.map((it, i) => (
              <div key={i} className="flex items-center gap-1 py-2 border-b">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{it.productName}</div>
                  <div className="flex gap-1 mt-1 items-center flex-wrap">
                    <span className="text-[10px] text-slate-500">كمية</span>
                    <input type="number" min="1" value={it.quantity} onChange={e => updateQty(i, parseInt(e.target.value) || 1)} className="w-14 border rounded px-1 py-0.5 text-xs" />
                    <span className="text-[10px] text-slate-500">× سعر</span>
                    <input type="number" step="0.01" value={it.unitPrice} onChange={e => updatePrice(i, parseFloat(e.target.value) || 0)} className="w-16 border rounded px-1 py-0.5 text-xs" />
                    <span className="text-[10px] text-slate-500">خصم</span>
                    <input type="number" step="0.01" min="0" value={it.discount || 0} onChange={e => updateItemDiscount(i, parseFloat(e.target.value) || 0)} className="w-14 border rounded px-1 py-0.5 text-xs" />
                  </div>
                </div>
                <div className="text-sm font-bold">{(it.unitPrice * it.quantity - (it.discount || 0)).toLocaleString("ar-SA")}</div>
                <button onClick={() => removeItem(i)} className="text-red-500 text-xs">✕</button>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-1 text-sm border-t pt-2">
            <div className="flex justify-between"><span>المجموع الفرعي</span><b>{calcTotals.subtotal.toLocaleString("ar-SA")} SAR</b></div>
            <div className="flex justify-between text-xs"><span>خصومات الأصناف</span><b className="text-red-600">-{calcTotals.itemDiscounts.toLocaleString("ar-SA")}</b></div>
            <div className="flex gap-2 items-center">
              <span className="text-xs">خصم إضافي</span>
              <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="flex-1 border rounded px-2 py-1 text-sm" />
            </div>
            <div className="flex justify-between text-xs"><span>الصافي قبل الضريبة</span><b>{calcTotals.netBeforeTax.toLocaleString("ar-SA")}</b></div>
            {taxEnabled ? (
              <>
                <div className="flex gap-2 items-center">
                  <span className="text-xs">ضريبة</span>
                  <input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} className="w-16 border rounded px-2 py-1 text-sm" />
                  <span className="text-xs">%</span>
                  <select value={taxMode} onChange={e => setTaxMode(e.target.value as any)} className="text-xs border rounded px-1 py-1">
                    <option value="exclusive">خارج السعر</option>
                    <option value="inclusive">داخل السعر</option>
                  </select>
                </div>
                <div className="flex justify-between text-xs"><span>مبلغ الضريبة</span><b>{calcTotals.tax.toLocaleString("ar-SA")}</b></div>
              </>
            ) : (
              <div className="text-xs text-slate-500">الضريبة معطلة لهذه الشركة</div>
            )}
            <div className="flex justify-between text-base font-black border-t pt-2 mt-1"><span>الإجمالي {taxEnabled && taxMode === "inclusive" ? "شامل" : ""}</span><span className="text-[#0f2a54]">{calcTotals.total.toLocaleString("ar-SA")} SAR</span></div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-bold">العميل</div>
              <button onClick={() => setShowNewCustomer(true)} className="text-xs bg-[#0f2a54] text-white px-2 py-0.5 rounded font-bold">+ إضافة عميل</button>
            </div>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full border rounded-xl px-2 py-1.5 text-sm bg-slate-50">
              <option value="">عميل نقدي</option>
              {(setup.customers || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-bold">الدفع (يمكن تقسيمها)</div>
              <button onClick={() => setPayments([...payments, { method: "cash", amount: "" }])} className="text-xs bg-slate-100 px-2 py-0.5 rounded">+ وسيلة</button>
            </div>
            {payments.map((p, i) => (
              <div key={i} className="flex gap-1 mb-1">
                <select value={p.method} onChange={e => setPayments(payments.map((x, idx) => idx === i ? { ...x, method: e.target.value } : x))} className="border rounded px-2 py-1 text-xs">
                  <option value="cash">نقدي</option>
                  <option value="card">بطاقة</option>
                  <option value="transfer">تحويل</option>
                  <option value="credit">آجل</option>
                </select>
                <input type="number" placeholder="مبلغ" value={p.amount} onChange={e => setPayments(payments.map((x, idx) => idx === i ? { ...x, amount: e.target.value } : x))} className="flex-1 border rounded px-2 py-1 text-xs" />
                {payments.length > 1 && <button onClick={() => setPayments(payments.filter((_, idx) => idx !== i))} className="text-red-500 text-xs">✕</button>}
              </div>
            ))}
            <button onClick={() => { const rem = calcTotals.total - paidTotal; if (rem > 0) setPayments([...payments.slice(0, -1), { ...payments[payments.length-1], amount: (parseFloat(payments[payments.length-1].amount||"0") + rem).toFixed(2) }]); }} className="text-[10px] text-blue-600 underline">المتبقي على آخر وسيلة</button>
            <div className="mt-2 text-xs space-y-0.5">
              <div className="flex justify-between"><span>المدفوع فعلياً</span><b className="text-emerald-600">{paidTotal.toFixed(2)}</b></div>
              {creditPayments.length > 0 && <div className="flex justify-between"><span>المتبقي (آجل)</span><b className="text-red-600">{remaining.toFixed(2)}</b></div>}
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button onClick={printCurrentInvoice} disabled={cart.length === 0} className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 py-3 rounded-xl font-bold text-sm">🖨️ معاينة وطباعة</button>
            <button onClick={completeSale} disabled={submitting || cart.length === 0} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold">
              {submitting ? "جاري الحفظ..." : `إتمام البيع — ${calcTotals.total.toLocaleString("ar-SA")} SAR`}
            </button>
          </div>
        </div>
      </div>

      {showNewCustomer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={addNewCustomer} className="bg-white rounded-2xl w-full max-w-[520px] p-6 max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center border-b pb-2 mb-3">
              <h2 className="font-bold text-[#0f2a54]">إضافة عميل سريع</h2>
              <button type="button" onClick={() => setShowNewCustomer(false)} className="w-8 h-8 bg-slate-100 rounded-full">✕</button>
            </div>
            <p className="text-xs text-slate-500 mb-3">سيتم إضافة العميل لقائمة العملاء وتحديده تلقائياً في الفاتورة الحالية</p>
            {newCustError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-2 text-xs mb-3">⚠️ {newCustError}</div>}
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="اسم العميل *" value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} className="col-span-2 border rounded-xl px-3 py-2.5 bg-slate-50" autoFocus />
              <input placeholder="رقم الهاتف" value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input placeholder="البريد الإلكتروني" type="email" value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input placeholder="الرقم الضريبي" value={newCust.taxNumber} onChange={e => setNewCust({ ...newCust, taxNumber: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input placeholder="العنوان" value={newCust.address} onChange={e => setNewCust({ ...newCust, address: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <textarea placeholder="ملاحظات" value={newCust.notes} onChange={e => setNewCust({ ...newCust, notes: e.target.value })} className="col-span-2 border rounded-xl p-3 bg-slate-50" rows={2} />
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" disabled={newCustSubmitting} className="flex-1 bg-[#0f2a54] text-white py-2.5 rounded-xl font-bold disabled:opacity-50">{newCustSubmitting ? "جاري الحفظ..." : "حفظ وتحديد"}</button>
              <button type="button" onClick={() => setShowNewCustomer(false)} className="flex-1 border py-2.5 rounded-xl">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}

function RegisterCreator({ companyId, branches, warehouses, onCreated }: any) {
  const [name, setName] = useState("الصندوق 1");
  const [branchId, setBranchId] = useState(branches?.[0]?.id || "");
  const [warehouseId, setWarehouseId] = useState(warehouses?.[0]?.id || "");
  return (
    <div className="mt-4 max-w-md mx-auto text-right space-y-2">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="اسم الصندوق" className="w-full border rounded-xl px-3 py-2 bg-slate-50" />
      <select value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full border rounded-xl px-3 py-2 bg-slate-50">
        {branches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full border rounded-xl px-3 py-2 bg-slate-50">
        {warehouses?.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select>
      <button onClick={async () => {
        const r = await fetch("/api/pos/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, branchId, warehouseId, name }) });
        if (r.ok) onCreated();
      }} className="w-full bg-[#0f2a54] text-white py-2 rounded-xl font-bold">إنشاء الصندوق</button>
    </div>
  );
}

export default function POSPage() {
  const params = useParams<{ companyId: string }>();
  return <AppShell companyId={params.companyId}><Suspense fallback={<div className="p-10 text-center">جاري التحميل...</div>}><POSInner /></Suspense></AppShell>;
}
