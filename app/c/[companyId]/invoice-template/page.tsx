"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import {
  DEFAULT_POS_TEMPLATE, DEFAULT_SALES_TEMPLATE, TEMPLATE_KEYS,
  loadTemplate, saveTemplate, clearTemplate,
  buildPosReceiptHTML, buildSalesInvoiceHTML, type PosTemplateConfig, type SalesTemplateConfig,
} from "@/lib/templates";
import { printHTML } from "@/lib/print";

type Tab = "pos" | "sales";

export default function InvoiceTemplatePage() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const [tab, setTab] = useState<Tab>("pos");
  const [pos, setPos] = useState<PosTemplateConfig>(DEFAULT_POS_TEMPLATE);
  const [sales, setSales] = useState<SalesTemplateConfig>(DEFAULT_SALES_TEMPLATE);
  const [company, setCompany] = useState<any>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setPos(loadTemplate(TEMPLATE_KEYS.pos(companyId), DEFAULT_POS_TEMPLATE));
    setSales(loadTemplate(TEMPLATE_KEYS.sales(companyId), DEFAULT_SALES_TEMPLATE));
    fetch(`/api/company-settings?companyId=${companyId}`).then(r => r.json()).then(d => { if (d.company) setCompany(d.company); });
  }, [companyId]);

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  const save = () => {
    if (tab === "pos") { saveTemplate(TEMPLATE_KEYS.pos(companyId), pos); notify("✓ تم حفظ قالب نقاط البيع"); }
    else { saveTemplate(TEMPLATE_KEYS.sales(companyId), sales); notify("✓ تم حفظ قالب فاتورة المبيعات PDF"); }
  };
  const reset = () => {
    if (tab === "pos") { clearTemplate(TEMPLATE_KEYS.pos(companyId)); setPos(DEFAULT_POS_TEMPLATE); notify("تمت استعادة قالب POS الافتراضي"); }
    else { clearTemplate(TEMPLATE_KEYS.sales(companyId)); setSales(DEFAULT_SALES_TEMPLATE); notify("تمت استعادة قالب المبيعات الافتراضي"); }
  };

  const previewPos = () => {
    if (!company) return;
    const html = buildPosReceiptHTML({
      company, tpl: pos,
      receiptNumber: "POS-2025-0001",
      date: new Date().toLocaleString("ar-SA"),
      customerName: "مؤسسة الرواد للتجارة",
      customerPhone: "0555123456",
      items: [
        { productName: "لابتوب HP ProBook 450", quantity: 1, unitPrice: 4200, discount: 0, total: 4200 },
        { productName: "طابعة ليزر Brother MFC", quantity: 2, unitPrice: 1250, discount: 100, total: 2400 },
      ],
      subtotal: 6700, discount: 100, taxRate: 15, taxAmount: 990, total: 7590,
      paid: 7590, change: 0,
      payments: [{ method: "cash", amount: 7590 }],
    });
    printHTML(html, { title: "معاينة قالب POS", paper: pos.paper === "A4" ? "A4" : "receipt" });
  };

  const previewSales = () => {
    if (!company) return;
    const html = buildSalesInvoiceHTML({
      company, tpl: sales,
      invoice: { invoiceNumber: "INV-2025-1001", type: "sale", status: "paid", createdAt: new Date().toISOString(), subtotal: "6700", discount: "100", taxRate: "15", taxAmount: "990", total: "7590", paidAmount: "5000", currency: company.currency || "SAR", notes: "التسليم خلال 7 أيام" },
      customer: { name: "مؤسسة الرواد للتجارة", phone: "0555123456", email: "rowad@example.com", taxNumber: "300123456700003", address: "الرياض - العليا" },
      items: [
        { productName: "لابتوب HP ProBook 450", quantity: 1, unitPrice: "4200", discount: "0", total: "4200" },
        { productName: "طابعة ليزر Brother MFC", quantity: 2, unitPrice: "1250", discount: "100", total: "2400" },
      ],
      payments: [{ method: "cash", amount: 5000 }],
    });
    printHTML(html, { title: "معاينة فاتورة المبيعات", paper: sales.paper, orientation: sales.orientation });
  };

  const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-slate-100">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );

  return (
    <AppShell companyId={companyId}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#0f2a54]">تصميم وطباعة الفواتير</h1>
          <p className="text-xs text-slate-500">قالبان منفصلان — قالب POS (إيصال) وقالب المبيعات (PDF) — لكل شركة على حدة</p>
        </div>
        {msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2 text-xs font-bold">{msg}</div>}
      </div>

      {/* التبويبات */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mt-4">
        <button onClick={() => setTab("pos")} className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${tab === "pos" ? "bg-white shadow" : "text-slate-600"}`}>
          🛒 قالب نقاط البيع (POS)
        </button>
        <button onClick={() => setTab("sales")} className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${tab === "sales" ? "bg-white shadow" : "text-slate-600"}`}>
          📄 قالب فاتورة المبيعات (PDF)
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        {/* ============ الإعدادات ============ */}
        <div className="bg-white border rounded-2xl p-5">
          <div className="font-bold mb-3 flex items-center justify-between">
            <span>⚙️ إعدادات القالب</span>
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">{tab === "pos" ? "POS" : "PDF"}</span>
          </div>

          {tab === "pos" ? (
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs font-bold text-slate-700">عرض الورق</label>
                <div className="flex gap-1 mt-1">
                  {([["80mm", "80mm (حراري)"], ["58mm", "58mm (صغير)"], ["A4", "A4"]] as any[]).map(([v, l]) => (
                    <button key={v} onClick={() => setPos({ ...pos, paper: v })} className={`px-3 py-1.5 rounded-lg text-xs ${pos.paper === v ? "bg-[#0f2a54] text-white font-bold" : "bg-slate-100"}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">الحقول المعروضة</label>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <Toggle label="شعار الشركة" checked={pos.showLogo} onChange={v => setPos({ ...pos, showLogo: v })} />
                  <Toggle label="بيانات الشركة" checked={pos.showCompanyDetails} onChange={v => setPos({ ...pos, showCompanyDetails: v })} />
                  <Toggle label="العنوان" checked={pos.showAddress} onChange={v => setPos({ ...pos, showAddress: v })} />
                  <Toggle label="الهاتف" checked={pos.showPhone} onChange={v => setPos({ ...pos, showPhone: v })} />
                  <Toggle label="الرقم الضريبي" checked={pos.showTaxNumber} onChange={v => setPos({ ...pos, showTaxNumber: v })} />
                  <Toggle label="اسم العميل" checked={pos.showCustomer} onChange={v => setPos({ ...pos, showCustomer: v })} />
                  <Toggle label="هاتف العميل" checked={pos.showCustomerPhone} onChange={v => setPos({ ...pos, showCustomerPhone: v })} />
                  <Toggle label="الخصومات" checked={pos.showItemDiscount} onChange={v => setPos({ ...pos, showItemDiscount: v })} />
                  <Toggle label="الضريبة" checked={pos.showTax} onChange={v => setPos({ ...pos, showTax: v })} />
                  <Toggle label="وسيلة الدفع" checked={pos.showPaymentMethod} onChange={v => setPos({ ...pos, showPaymentMethod: v })} />
                  <Toggle label="المبلغ المتبقي" checked={pos.showChange} onChange={v => setPos({ ...pos, showChange: v })} />
                  <Toggle label="التذييل" checked={pos.showFooter} onChange={v => setPos({ ...pos, showFooter: v })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold">اللون الأساسي</label>
                  <input type="color" value={pos.accentColor} onChange={e => setPos({ ...pos, accentColor: e.target.value })} className="w-full h-9 border rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-bold">حجم الخط: {pos.fontSize}</label>
                  <input type="range" min="8" max="16" value={pos.fontSize} onChange={e => setPos({ ...pos, fontSize: parseInt(e.target.value) })} className="w-full mt-2" />
                </div>
              </div>
              <Toggle label="عرض مضغوط للأصناف (سطر واحد)" checked={pos.compactItems} onChange={v => setPos({ ...pos, compactItems: v })} />
              <div>
                <label className="text-xs font-bold">نص التذييل</label>
                <textarea value={pos.footerText} onChange={e => setPos({ ...pos, footerText: e.target.value })} rows={2} className="w-full mt-1 border rounded-xl p-2.5 bg-slate-50 text-sm" />
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold">حجم الورق</label>
                  <select value={sales.paper} onChange={e => setSales({ ...sales, paper: e.target.value as any })} className="w-full border rounded-xl px-2 py-2 bg-slate-50">
                    <option value="A4">A4</option><option value="A5">A5</option><option value="Letter">Letter</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold">الاتجاه</label>
                  <select value={sales.orientation} onChange={e => setSales({ ...sales, orientation: e.target.value as any })} className="w-full border rounded-xl px-2 py-2 bg-slate-50">
                    <option value="portrait">عمودي</option><option value="landscape">أفقي</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">الحقول المعروضة</label>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <Toggle label="شعار الشركة" checked={sales.showLogo} onChange={v => setSales({ ...sales, showLogo: v })} />
                  <Toggle label="بيانات الشركة" checked={sales.showCompanyDetails} onChange={v => setSales({ ...sales, showCompanyDetails: v })} />
                  <Toggle label="هاتف الشركة" checked={sales.showPhone} onChange={v => setSales({ ...sales, showPhone: v })} />
                  <Toggle label="الرقم الضريبي" checked={sales.showTaxNumber} onChange={v => setSales({ ...sales, showTaxNumber: v })} />
                  <Toggle label="بيانات العميل" checked={sales.showCustomerDetails} onChange={v => setSales({ ...sales, showCustomerDetails: v })} />
                  <Toggle label="الرقم الضريبي للعميل" checked={sales.showCustomerTax} onChange={v => setSales({ ...sales, showCustomerTax: v })} />
                  <Toggle label="جدول الأصناف" checked={sales.showItems} onChange={v => setSales({ ...sales, showItems: v })} />
                  <Toggle label="الخصومات" checked={sales.showDiscount} onChange={v => setSales({ ...sales, showDiscount: v })} />
                  <Toggle label="الضريبة" checked={sales.showTax} onChange={v => setSales({ ...sales, showTax: v })} />
                  <Toggle label="المدفوع والمتبقي" checked={sales.showPayment} onChange={v => setSales({ ...sales, showPayment: v })} />
                  <Toggle label="الملاحظات" checked={sales.showNotes} onChange={v => setSales({ ...sales, showNotes: v })} />
                  <Toggle label="التوقيعات" checked={sales.showSignatures} onChange={v => setSales({ ...sales, showSignatures: v })} />
                  <Toggle label="التذييل" checked={sales.showFooter} onChange={v => setSales({ ...sales, showFooter: v })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold">اللون الأساسي</label>
                  <input type="color" value={sales.accentColor} onChange={e => setSales({ ...sales, accentColor: e.target.value })} className="w-full h-9 border rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-bold">حجم الخط: {sales.fontSize}</label>
                  <input type="range" min="9" max="16" value={sales.fontSize} onChange={e => setSales({ ...sales, fontSize: parseInt(e.target.value) })} className="w-full mt-2" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold">نص التذييل</label>
                <textarea value={sales.footerText} onChange={e => setSales({ ...sales, footerText: e.target.value })} rows={2} className="w-full mt-1 border rounded-xl p-2.5 bg-slate-50 text-sm" />
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4 pt-3 border-t">
            <button onClick={save} className="flex-1 bg-[#0f2a54] text-white py-2.5 rounded-xl font-bold">حفظ القالب</button>
            <button onClick={reset} className="bg-slate-100 px-4 py-2.5 rounded-xl text-sm">استعادة الافتراضي</button>
          </div>
        </div>

        {/* ============ المعاينة ============ */}
        <div className="bg-slate-100 border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold">👁️ معاينة حية</div>
            <button onClick={tab === "pos" ? previewPos : previewSales} className="bg-[#0f2a54] text-white px-4 py-1.5 rounded-xl text-xs font-bold">🖨️ طباعة المعاينة</button>
          </div>

          {company && tab === "pos" && (
            <div className="bg-white mx-auto shadow-lg p-3" style={{ width: pos.paper === "58mm" ? "58mm" : pos.paper === "80mm" ? "80mm" : "100%" }}>
              <div
                className="prose-none"
                dangerouslySetInnerHTML={{ __html: buildPosReceiptHTML({
                  company, tpl: pos,
                  receiptNumber: "POS-2025-0001",
                  date: new Date().toLocaleString("ar-SA"),
                  customerName: "مؤسسة الرواد للتجارة",
                  customerPhone: "0555123456",
                  items: [
                    { productName: "لابتوب HP ProBook 450", quantity: 1, unitPrice: 4200, discount: 0, total: 4200 },
                    { productName: "طابعة ليزر Brother MFC", quantity: 2, unitPrice: 1250, discount: 100, total: 2400 },
                  ],
                  subtotal: 6700, discount: 100, taxRate: 15, taxAmount: 990, total: 7590,
                  paid: 7590, change: 0,
                  payments: [{ method: "cash", amount: 7590 }],
                }) }}
              />
            </div>
          )}

          {company && tab === "sales" && (
            <div className="bg-white mx-auto shadow-lg p-5 overflow-auto" style={{ maxHeight: "600px" }}>
              <div dangerouslySetInnerHTML={{ __html: buildSalesInvoiceHTML({
                company, tpl: sales,
                invoice: { invoiceNumber: "INV-2025-1001", type: "sale", status: "paid", createdAt: new Date().toISOString(), subtotal: "6700", discount: "100", taxRate: "15", taxAmount: "990", total: "7590", paidAmount: "5000", currency: company.currency || "SAR", notes: "التسليم خلال 7 أيام" },
                customer: { name: "مؤسسة الرواد للتجارة", phone: "0555123456", email: "rowad@example.com", taxNumber: "300123456700003", address: "الرياض - العليا" },
                items: [
                  { productName: "لابتوب HP ProBook 450", quantity: 1, unitPrice: "4200", discount: "0", total: "4200" },
                  { productName: "طابعة ليزر Brother MFC", quantity: 2, unitPrice: "1250", discount: "100", total: "2400" },
                ],
                payments: [{ method: "cash", amount: 5000 }],
              }) }} />
            </div>
          )}

          <div className="text-[11px] text-center text-slate-500 mt-3">
            القالب يُطبَّق تلقائياً عند الطباعة • بيانات الشركة فقط (بدون اسم المنصة أو شعارها)
          </div>
        </div>
      </div>
    </AppShell>
  );
}
