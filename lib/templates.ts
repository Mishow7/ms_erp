/**
 * قوالب الطباعة الموحدة — MS للأعمال البرمجية
 * قالبان منفصلان:
 *  - posReceipt : إيصال نقطة البيع (80mm مضغوط)
 *  - salesInvoice: فاتورة مبيعات PDF (A4)
 * كل قالب يستخدم بيانات الشركة فقط (بدون اسم المنصة أو شعارها).
 */

export type CompanyInfo = {
  name: string;
  nameEn?: string | null;
  logoUrl?: string | null;
  taxNumber?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  currency?: string | null;
  contractFooter?: string | null;
};

export type PosTemplateConfig = {
  paper: "80mm" | "58mm" | "A4";
  showLogo: boolean;
  showCompanyDetails: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showTaxNumber: boolean;
  showCustomer: boolean;
  showCustomerPhone: boolean;
  showItemDiscount: boolean;
  showTax: boolean;
  showPaymentMethod: boolean;
  showChange: boolean;
  showFooter: boolean;
  footerText: string;
  accentColor: string;
  fontSize: number;
  compactItems: boolean;
};

export type SalesTemplateConfig = {
  paper: "A4" | "A5" | "Letter";
  orientation: "portrait" | "landscape";
  showLogo: boolean;
  showCompanyDetails: boolean;
  showPhone: boolean;
  showTaxNumber: boolean;
  showCustomerDetails: boolean;
  showCustomerTax: boolean;
  showItems: boolean;
  showDiscount: boolean;
  showTax: boolean;
  showPayment: boolean;
  showNotes: boolean;
  showSignatures: boolean;
  showFooter: boolean;
  footerText: string;
  accentColor: string;
  fontSize: number;
};

export const DEFAULT_POS_TEMPLATE: PosTemplateConfig = {
  paper: "80mm",
  showLogo: true,
  showCompanyDetails: true,
  showAddress: true,
  showPhone: true,
  showTaxNumber: true,
  showCustomer: true,
  showCustomerPhone: true,
  showItemDiscount: true,
  showTax: true,
  showPaymentMethod: true,
  showChange: true,
  showFooter: true,
  footerText: "شكراً لزيارتكم",
  accentColor: "#0f2a54",
  fontSize: 11,
  compactItems: true,
};

export const DEFAULT_SALES_TEMPLATE: SalesTemplateConfig = {
  paper: "A4",
  orientation: "portrait",
  showLogo: true,
  showCompanyDetails: true,
  showPhone: true,
  showTaxNumber: true,
  showCustomerDetails: true,
  showCustomerTax: true,
  showItems: true,
  showDiscount: true,
  showTax: true,
  showPayment: true,
  showNotes: true,
  showSignatures: true,
  showFooter: true,
  footerText: "شكراً لتعاملكم معنا",
  accentColor: "#0f2a54",
  fontSize: 12,
};

export const TEMPLATE_KEYS = {
  pos: (companyId: string) => `ms_tpl_pos_${companyId}`,
  sales: (companyId: string) => `ms_tpl_sales_${companyId}`,
};

export function loadTemplate<T>(key: string, defaults: T): T {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {}
  return defaults;
}

export function saveTemplate(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function clearTemplate(key: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(key); } catch {}
}

const methodLabel = (m: string) =>
  m === "cash" ? "نقدي" : m === "card" ? "بطاقة" : m === "transfer" ? "تحويل" : m === "credit" ? "آجل" : m;

const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const num = (n: any) => parseFloat(n || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ============================================================
   قالب إيصال نقطة البيع (POS Receipt) — 80mm / 58mm
   ============================================================ */
export function buildPosReceiptHTML(opts: {
  company: CompanyInfo;
  tpl: PosTemplateConfig;
  receiptNumber: string;
  date: string;
  customerName?: string | null;
  customerPhone?: string | null;
  items: { productName: string; quantity: number; unitPrice: number; discount?: number; total: number }[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paid: number;
  change: number;
  payments: { method: string; amount: number }[];
  currency?: string;
  shiftOrUser?: string | null;
}): string {
  const { company: c, tpl } = opts;
  const cur = opts.currency || c.currency || "SAR";
  const accent = tpl.accentColor || "#0f2a54";
  const fs = tpl.fontSize || 11;
  const lineH = tpl.compactItems ? "1.35" : "1.6";

  return `
<div style="font-family:'Tajawal',system-ui,sans-serif;font-size:${fs}px;width:100%;color:#111827">
  <!-- تروئة -->
  <div style="text-align:center;border-bottom:2px solid ${accent};padding-bottom:6px;margin-bottom:6px">
    ${tpl.showLogo && c.logoUrl ? `<img src="${esc(c.logoUrl)}" style="max-height:38px;max-width:130px;object-fit:contain;margin:0 auto 3px" />` : ""}
    <div style="font-size:${fs + 7}px;font-weight:800;color:${accent};line-height:1.2">${esc(c.name)}</div>
    ${c.nameEn && tpl.showCompanyDetails ? `<div style="font-size:${fs - 2}px;color:#6b7280">${esc(c.nameEn)}</div>` : ""}
    ${tpl.showCompanyDetails && c.address ? `<div style="font-size:${fs - 2}px;color:#374151;margin-top:2px">${esc(c.address)}</div>` : ""}
    ${tpl.showPhone && c.phone ? `<div style="font-size:${fs - 2}px;color:#374151">هاتف: ${esc(c.phone)}</div>` : ""}
    ${tpl.showTaxNumber && c.taxNumber ? `<div style="font-size:${fs - 2}px;color:#374151">الرقم الضريبي: ${esc(c.taxNumber)}</div>` : ""}
  </div>

  <!-- بيانات الإيصال -->
  <div style="display:flex;justify-content:space-between;font-size:${fs - 1}px;margin-bottom:2px">
    <span>إيصال: <b style="font-family:monospace">${esc(opts.receiptNumber)}</b></span>
    <span>${esc(opts.date)}</span>
  </div>
  ${tpl.showCustomer && (opts.customerName || opts.customerPhone) ? `
  <div style="border-top:1px dashed #9ca3af;padding-top:4px;margin-top:4px;font-size:${fs - 1}px">
    <div>العميل: <b>${esc(opts.customerName || "نقدي")}</b></div>
    ${tpl.showCustomerPhone && opts.customerPhone ? `<div>الهاتف: ${esc(opts.customerPhone)}</div>` : ""}
  </div>` : ""}

  <!-- الأصناف -->
  <table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:${fs - 1}px;line-height:${lineH}">
    <thead>
      <tr style="background:${accent};color:#fff">
        <th style="padding:3px 2px;text-align:right;font-weight:700">الصنف</th>
        <th style="padding:3px 2px;text-align:center;font-weight:700;width:34px">كمية</th>
        <th style="padding:3px 2px;text-align:center;font-weight:700;width:52px">السعر</th>
        <th style="padding:3px 2px;text-align:center;font-weight:700;width:58px">الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${opts.items.map(it => `
      <tr style="border-bottom:1px dotted #d1d5db">
        <td style="padding:3px 2px;text-align:right">${esc(it.productName)}</td>
        <td style="padding:3px 2px;text-align:center">${it.quantity}</td>
        <td style="padding:3px 2px;text-align:center">${num(it.unitPrice)}</td>
        <td style="padding:3px 2px;text-align:center;font-weight:700">${num(it.total)}</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <!-- الحسابات -->
  <div style="margin-top:6px;font-size:${fs - 1}px;line-height:1.6">
    <div style="display:flex;justify-content:space-between"><span>المجموع الفرعي</span><b>${num(opts.subtotal)}</b></div>
    ${tpl.showItemDiscount && opts.discount > 0 ? `<div style="display:flex;justify-content:space-between"><span>الخصم</span><b>-${num(opts.discount)}</b></div>` : ""}
    ${tpl.showTax && opts.taxAmount > 0 ? `<div style="display:flex;justify-content:space-between"><span>الضريبة (${opts.taxRate}%)</span><b>${num(opts.taxAmount)}</b></div>` : ""}
    <div style="display:flex;justify-content:space-between;border-top:1.5px solid ${accent};margin-top:3px;padding-top:3px;font-size:${fs + 3}px;font-weight:800;color:${accent}">
      <span>الإجمالي</span><span>${num(opts.total)} ${esc(cur)}</span>
    </div>
    ${tpl.showPaymentMethod ? `
    <div style="display:flex;justify-content:space-between;margin-top:3px"><span>المدفوع</span><b>${num(opts.paid)}</b></div>
    ${opts.payments.map(p => `<div style="display:flex;justify-content:space-between;font-size:${fs - 2}px;color:#4b5563"><span>(${methodLabel(p.method)})</span><span>${num(p.amount)}</span></div>`).join("")}
    ${tpl.showChange ? `<div style="display:flex;justify-content:space-between"><span>الباقي</span><b>${num(opts.change)}</b></div>` : ""}` : ""}
  </div>

  ${tpl.showFooter ? `
  <div style="margin-top:8px;border-top:1px dashed #9ca3af;padding-top:5px;text-align:center;font-size:${fs - 2}px;color:#4b5563;white-space:pre-wrap">${esc(tpl.footerText || c.contractFooter || "")}</div>` : ""}
</div>`;
}

/* ============================================================
   قالب فاتورة المبيعات PDF (A4)
   ============================================================ */
export function buildSalesInvoiceHTML(opts: {
  company: CompanyInfo;
  tpl: SalesTemplateConfig;
  invoice: any;
  customer?: any;
  items: any[];
  payments?: { method: string; amount: number }[];
}): string {
  const { company: c, tpl } = opts;
  const inv = opts.invoice;
  const cust = opts.customer;
  const cur = inv.currency || c.currency || "SAR";
  const accent = tpl.accentColor || "#0f2a54";
  const fs = tpl.fontSize || 12;
  const total = parseFloat(inv.total || 0);
  const paid = parseFloat(inv.paidAmount || 0);
  const remaining = Math.max(0, total - paid);

  return `
<div style="font-family:'Tajawal',system-ui,sans-serif;font-size:${fs}px;color:#0f172a;line-height:1.6">
  <!-- ترويسة -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${accent};padding-bottom:12px">
    <div style="flex:1">
      ${tpl.showLogo && c.logoUrl ? `<img src="${esc(c.logoUrl)}" style="max-height:52px;max-width:180px;object-fit:contain;margin-bottom:6px" />` : ""}
      <div style="font-size:${fs + 11}px;font-weight:800;color:${accent};line-height:1.25">${esc(c.name)}</div>
      ${c.nameEn && tpl.showCompanyDetails ? `<div style="font-size:${fs - 1}px;color:#64748b">${esc(c.nameEn)}</div>` : ""}
      ${tpl.showCompanyDetails ? `<div style="font-size:${fs - 2}px;color:#475569;margin-top:5px;line-height:1.75">
        ${c.address ? `<div>العنوان: ${esc(c.address)}</div>` : ""}
        ${tpl.showPhone && c.phone ? `<div>الهاتف: ${esc(c.phone)}</div>` : ""}
        ${c.email ? `<div>البريد الإلكتروني: ${esc(c.email)}</div>` : ""}
        ${tpl.showTaxNumber && c.taxNumber ? `<div>الرقم الضريبي: ${esc(c.taxNumber)}</div>` : ""}
      </div>` : ""}
    </div>
    <div style="text-align:left;min-width:190px">
      <div style="background:${accent};color:#fff;padding:8px 16px;border-radius:8px;display:inline-block;text-align:center">
        <div style="font-weight:800;font-size:${fs + 2}px">${inv.type === "purchase" ? "فاتورة شراء" : "فاتورة ضريبية"}</div>
        <div style="font-family:monospace;font-size:${fs - 1}px">${esc(inv.invoiceNumber)}</div>
      </div>
      <div style="font-size:${fs - 2}px;color:#475569;margin-top:8px;line-height:1.85">
        <div>تاريخ الإصدار: ${new Date(inv.createdAt).toLocaleDateString("ar-SA")}</div>
        ${inv.dueDate ? `<div>تاريخ الاستحقاق: ${new Date(inv.dueDate).toLocaleDateString("ar-SA")}</div>` : ""}
        <div>الحالة: ${esc(inv.status === "paid" ? "مدفوعة" : inv.status === "sent" ? "مستحقة" : inv.status === "overdue" ? "متأخرة" : esc(inv.status))}</div>
      </div>
    </div>
  </div>

  <!-- بيانات العميل -->
  ${tpl.showCustomerDetails ? `
  <div style="margin-top:14px;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;background:#f8fafc">
    <div style="font-weight:700;color:${accent};margin-bottom:4px;font-size:${fs + 1}px">بيانات العميل</div>
    <div style="font-size:${fs - 1}px;line-height:1.85;color:#334155;display:grid;grid-template-columns:1fr 1fr;gap:0 20px">
      <div><b>الاسم:</b> ${esc(cust?.name || "عميل نقدي")}</div>
      ${cust?.phone ? `<div><b>الهاتف:</b> ${esc(cust.phone)}</div>` : ""}
      ${cust?.email ? `<div><b>البريد:</b> ${esc(cust.email)}</div>` : ""}
      ${tpl.showCustomerTax && cust?.taxNumber ? `<div><b>الرقم الضريبي:</b> ${esc(cust.taxNumber)}</div>` : ""}
      ${cust?.address || cust?.city ? `<div><b>العنوان:</b> ${esc(cust.address || cust.city)}</div>` : ""}
    </div>
  </div>` : ""}

  <!-- الأصناف -->
  ${tpl.showItems ? `
  <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:${fs - 1}px">
    <thead>
      <tr style="background:${accent};color:#fff">
        <th style="padding:7px 8px;text-align:right;font-weight:700;width:36px">#</th>
        <th style="padding:7px 8px;text-align:right;font-weight:700">وصف الصنف</th>
        <th style="padding:7px 8px;text-align:center;font-weight:700;width:60px">الكمية</th>
        <th style="padding:7px 8px;text-align:center;font-weight:700;width:80px">السعر</th>
        ${tpl.showDiscount ? `<th style="padding:7px 8px;text-align:center;font-weight:700;width:70px">الخصم</th>` : ""}
        <th style="padding:7px 8px;text-align:center;font-weight:700;width:90px">الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${opts.items.length ? opts.items.map((it: any, i: number) => `
      <tr style="border-bottom:1px solid #e2e8f0;${i % 2 ? "background:#f8fafc" : ""}">
        <td style="padding:6px 8px;text-align:center;color:#64748b">${i + 1}</td>
        <td style="padding:6px 8px;text-align:right">${esc(it.productName)}</td>
        <td style="padding:6px 8px;text-align:center">${it.quantity}</td>
        <td style="padding:6px 8px;text-align:center">${num(it.unitPrice)}</td>
        ${tpl.showDiscount ? `<td style="padding:6px 8px;text-align:center;color:#dc2626">${parseFloat(it.discount || 0) > 0 ? "-" + num(it.discount) : "—"}</td>` : ""}
        <td style="padding:6px 8px;text-align:center;font-weight:700">${num(it.total)}</td>
      </tr>`).join("") : `<tr><td colspan="${tpl.showDiscount ? 6 : 5}" style="padding:12px;text-align:center;color:#94a3b8">لا توجد بنود</td></tr>`}
    </tbody>
  </table>` : ""}

  <!-- الحسابات -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:14px;gap:20px">
    <div style="flex:1;font-size:${fs - 1}px;color:#64748b">
      ${tpl.showNotes && inv.notes ? `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;background:#fff"><b style="color:#334155">ملاحظات:</b> ${esc(inv.notes)}</div>` : ""}
    </div>
    <div style="width:300px;font-size:${fs - 1}px;line-height:1.9">
      <div style="display:flex;justify-content:space-between;padding:2px 0"><span>المجموع الفرعي</span><b>${num(inv.subtotal)} ${esc(cur)}</b></div>
      ${tpl.showDiscount && parseFloat(inv.discount || 0) > 0 ? `<div style="display:flex;justify-content:space-between;padding:2px 0;color:#dc2626"><span>الخصم</span><b>-${num(inv.discount)}</b></div>` : ""}
      ${tpl.showTax ? `<div style="display:flex;justify-content:space-between;padding:2px 0"><span>الضريبة (${inv.taxRate || 0}%)</span><b>${num(inv.taxAmount || 0)}</b></div>` : ""}
      <div style="display:flex;justify-content:space-between;border-top:2px solid ${accent};margin-top:5px;padding-top:5px;font-size:${fs + 4}px;font-weight:800;color:${accent}">
        <span>الإجمالي</span><span>${num(total)} ${esc(cur)}</span>
      </div>
      ${tpl.showPayment ? `
        <div style="display:flex;justify-content:space-between;margin-top:5px"><span>المدفوع</span><b>${num(paid)}</b></div>
        ${remaining > 0 ? `<div style="display:flex;justify-content:space-between;color:#dc2626;font-weight:700"><span>المتبقي</span><b>${num(remaining)}</b></div>` : `<div style="display:flex;justify-content:space-between;color:#059669"><span>الحالة</span><b>مسددة بالكامل</b></div>`}
        ${opts.payments?.length ? `<div style="margin-top:4px;color:#64748b;font-size:${fs - 2}px">${opts.payments.map((p: any) => `${methodLabel(p.method)}: ${num(p.amount)}`).join(" • ")}</div>` : ""}
      ` : ""}
    </div>
  </div>

  <!-- التوقيعات -->
  ${tpl.showSignatures ? `
  <div style="display:flex;justify-content:space-between;margin-top:40px;font-size:${fs - 1}px">
    <div style="text-align:center;flex:1;padding:0 20px"><div style="border-top:1px solid #94a3b8;padding-top:6px">توقيع العميل</div></div>
    <div style="text-align:center;flex:1;padding:0 20px"><div style="border-top:1px solid #94a3b8;padding-top:6px">توقيع الشركة / الختم</div></div>
  </div>` : ""}

  <!-- التذييل -->
  ${tpl.showFooter ? `
  <div style="margin-top:22px;border-top:2px solid ${accent};padding-top:8px;text-align:center;font-size:${fs - 3}px;color:#64748b;white-space:pre-wrap">
    ${esc(tpl.footerText || c.contractFooter || `شكراً لتعاملكم معنا — ${c.name}`)}
  </div>` : ""}
</div>`;
}
