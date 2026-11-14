"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import { printElement, printHTML } from "@/lib/print";
import { buildPosReceiptHTML, loadTemplate, DEFAULT_POS_TEMPLATE, TEMPLATE_KEYS, type PosTemplateConfig } from "@/lib/templates";

export default function ReceiptPage() {
  const params = useParams<{ companyId: string; id: string }>();
  const [data, setData] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [tpl, setTpl] = useState<PosTemplateConfig>(DEFAULT_POS_TEMPLATE);
  useEffect(() => {
    setTpl(loadTemplate(TEMPLATE_KEYS.pos(params.companyId), DEFAULT_POS_TEMPLATE));
    fetch(`/api/pos/sales/${params.id}`).then(r => r.json()).then(setData);
    fetch("/api/companies").then(r => r.json()).then(d => { if (d.companies) setCompany(d.companies.find((c: any) => c.id === params.companyId)); });
  }, [params.id, params.companyId]);
  if (!data || !company) return <AppShell companyId={params.companyId}><div className="p-10 text-center">جاري التحميل...</div></AppShell>;
  const sale = data.sale; const items = data.items; const payments = data.payments;
  const methodLabel = (m: string) => m === "cash" ? "نقدي" : m === "card" ? "بطاقة" : m === "transfer" ? "تحويل" : m === "credit" ? "آجل" : m;

  const printTplReceipt = () => {
    const cust = data.customer;
    const html = buildPosReceiptHTML({
      company: {
        name: company.name, nameEn: company.nameEn, logoUrl: company.logoUrl,
        taxNumber: company.taxNumber, address: company.address, phone: company.phone,
        email: company.email, currency: company.currency, contractFooter: company.contractFooter,
      },
      tpl,
      receiptNumber: sale.receiptNumber,
      date: new Date(sale.createdAt).toLocaleString("ar-SA"),
      customerName: cust?.name || null,
      customerPhone: cust?.phone || null,
      items: items.map((it: any) => ({
        productName: it.productName, quantity: it.quantity, unitPrice: parseFloat(it.unitPrice),
        discount: parseFloat(it.discount || 0), total: parseFloat(it.total),
      })),
      subtotal: parseFloat(sale.subtotal),
      discount: parseFloat(sale.discount || 0),
      taxRate: parseFloat(sale.taxRate || 0),
      taxAmount: parseFloat(sale.taxAmount || 0),
      total: parseFloat(sale.total),
      paid: parseFloat(sale.paid),
      change: parseFloat(sale.change || 0),
      payments: payments.map((p: any) => ({ method: p.method, amount: parseFloat(p.amount) })),
      currency: sale.currency || "SAR",
    });
    printHTML(html, { title: `إيصال ${sale.receiptNumber}`, paper: tpl.paper === "A4" ? "A4" : "receipt" });
  };

  return (
    <AppShell companyId={params.companyId}>
      <div className="flex gap-2 no-print">
        <button onClick={printTplReceipt} className="bg-[#0f2a54] text-white px-5 py-2 rounded-xl font-bold">🖨️ طباعة الإيصال (قالب POS)</button>
        <button onClick={() => printElement("print-receipt", { title: `إيصال ${sale.receiptNumber}`, paper: "A4" })} className="bg-white border px-4 py-2 rounded-xl text-sm">🖨️ نسخة A4</button>
        <a href={`/c/${params.companyId}/invoice-template`} className="bg-white border px-4 py-2 rounded-xl text-sm">⚙️ تخصيص القالب</a>
        <a href={`/c/${params.companyId}/pos`} className="bg-white border px-4 py-2 rounded-xl text-sm">العودة لشاشة البيع</a>
      </div>

      {/* ===== الإيصال — هذا هو العنصر الوحيد الذي يُطبع ===== */}
      <div id="print-receipt" className="print-area bg-white border rounded-2xl p-6 mt-4 max-w-[420px] mx-auto">
        <div className="text-center border-b-2 border-[#0f2a54] pb-3">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoUrl} alt="" className="w-16 h-10 object-contain mx-auto mb-2" />
          ) : (
            <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center font-black text-white" style={{ background: company.primaryColor || "#0f2a54" }}>MS</div>
          )}
          <div className="text-xl font-extrabold text-[#0f2a54]">{company.name}</div>
          {company.nameEn && <div className="text-xs text-slate-500">{company.nameEn}</div>}
          <div className="text-[11px] text-slate-600 mt-2 space-y-0.5">
            {company.address && <div>{company.address}</div>}
            {company.phone && <div>هاتف: {company.phone}</div>}
            {company.email && <div>{company.email}</div>}
            {company.taxNumber && <div>الرقم الضريبي: {company.taxNumber}</div>}
          </div>
        </div>

        <div className="text-center mt-2">
          <span className="text-xs bg-slate-100 px-3 py-1 rounded-full inline-block">إيصال بيع</span>
        </div>

        <div className="flex justify-between text-xs mt-3 pb-2 border-b">
          <span>رقم الإيصال: <b className="font-mono">{sale.receiptNumber}</b></span>
          <span>{new Date(sale.createdAt).toLocaleString("ar-SA")}</span>
        </div>

        <table className="w-full text-xs mt-2">
          <thead><tr className="border-b bg-slate-100"><th className="py-1 px-1 text-right">الصنف</th><th className="px-1">×</th><th className="px-1">السعر</th><th className="px-1">الإجمالي</th></tr></thead>
          <tbody>
            {items.map((it: any) => (
              <tr key={it.id} className="border-b">
                <td className="py-1 px-1 text-right">{it.productName}</td>
                <td className="px-1 text-center">{it.quantity}</td>
                <td className="px-1 text-center">{parseFloat(it.unitPrice).toFixed(2)}</td>
                <td className="px-1 text-center font-bold">{parseFloat(it.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-xs mt-3 space-y-1">
          <div className="flex justify-between"><span>المجموع الفرعي</span><b>{parseFloat(sale.subtotal).toFixed(2)}</b></div>
          {parseFloat(sale.discount || 0) > 0 && <div className="flex justify-between"><span>الخصم</span><b>-{parseFloat(sale.discount).toFixed(2)}</b></div>}
          {parseFloat(sale.taxAmount || 0) > 0 && <div className="flex justify-between"><span>الضريبة ({sale.taxRate}%)</span><b>{parseFloat(sale.taxAmount).toFixed(2)}</b></div>}
          <div className="flex justify-between text-base font-black border-t pt-1 mt-1"><span>الإجمالي</span><span>{parseFloat(sale.total).toFixed(2)} {sale.currency || "SAR"}</span></div>
          <div className="flex justify-between"><span>المستلم</span><b>{parseFloat(sale.paid).toFixed(2)}</b></div>
          <div className="flex justify-between"><span>الباقي</span><b>{parseFloat(sale.change).toFixed(2)}</b></div>
        </div>

        <div className="mt-3 text-[11px]">
          <b>الدفع:</b>{" "}
          {payments.map((p: any) => `${methodLabel(p.method)} (${parseFloat(p.amount).toFixed(2)})`).join(" + ")}
        </div>

        <div className="text-center text-[10px] text-slate-500 mt-3 border-t pt-2 whitespace-pre-wrap">
          {company.contractFooter || `شكراً لزيارتكم — ${company.name}`}
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-400 mt-4 no-print">
        будет في الطباعة: بيانات الشركة فقط (بدون اسم المنصة أو شعارها)
      </div>
    </AppShell>
  );
}
