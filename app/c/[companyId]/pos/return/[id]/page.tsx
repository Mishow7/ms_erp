"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/Shell";

export default function ReturnPage() {
  const params = useParams<{ companyId: string; id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [restockTo, setRestockTo] = useState("good");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetch(`/api/pos/sales/${params.id}`).then(r => r.json()).then(setData); }, [params.id]);
  if (!data) return <AppShell companyId={params.companyId}><div className="p-10 text-center">جاري التحميل...</div></AppShell>;
  const sale = data.sale; const items = data.items;

  const refundTotal = items.reduce((a: number, it: any) => {
    const q = selections[it.id] || 0;
    return a + parseFloat(it.unitPrice) * q;
  }, 0);

  const submit = async () => {
    const retItems = items.filter((it: any) => (selections[it.id] || 0) > 0).map((it: any) => ({
      saleItemId: it.id, productId: it.productId, productName: it.productName, quantity: selections[it.id], unitPrice: it.unitPrice,
    }));
    if (retItems.length === 0) return alert("حدد الأصناف المرتجعة");
    if (!reason) return alert("أدخل سبب الإرجاع");
    setSubmitting(true);
    const r = await fetch("/api/pos/returns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saleId: sale.id, items: retItems, reason, refundMethod, restockTo }) });
    const j = await r.json();
    setSubmitting(false);
    if (r.ok) { alert(`تم تسجيل المرتجع ${j.return.returnNumber}`); router.push(`/c/${params.companyId}/pos-sales`); }
    else alert(j.error);
  };

  return (
    <AppShell companyId={params.companyId}>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">إرجاع بضاعة — فاتورة {sale.receiptNumber}</h1>
      <div className="bg-white border rounded-2xl p-5 mt-4">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50"><th className="p-2 text-right">الصنف</th><th className="p-2">المباع</th><th className="p-2">المرتجع سابقاً</th><th className="p-2">المتاح للإرجاع</th><th className="p-2">سعر الوحدة</th><th className="p-2">كمية الإرجاع</th></tr></thead>
          <tbody>
            {items.map((it: any) => {
              const available = it.quantity - it.returnedQty;
              return (
                <tr key={it.id} className="border-t">
                  <td className="p-2">{it.productName}</td>
                  <td className="p-2 text-center">{it.quantity}</td>
                  <td className="p-2 text-center">{it.returnedQty}</td>
                  <td className="p-2 text-center font-bold">{available}</td>
                  <td className="p-2 text-center">{parseFloat(it.unitPrice).toFixed(2)}</td>
                  <td className="p-2 text-center">
                    <input type="number" min="0" max={available} disabled={available === 0} value={selections[it.id] || 0} onChange={e => setSelections({ ...selections, [it.id]: Math.min(available, parseInt(e.target.value) || 0) })} className="w-20 border rounded px-2 py-1" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="grid md:grid-cols-3 gap-3 mt-4">
          <div>
            <label className="text-xs font-bold">سبب الإرجاع *</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="مثال: عيب في المنتج" className="w-full border rounded-xl px-3 py-2 bg-slate-50 mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold">طريقة رد المبلغ</label>
            <select value={refundMethod} onChange={e => setRefundMethod(e.target.value)} className="w-full border rounded-xl px-3 py-2 bg-slate-50 mt-1">
              <option value="cash">نقدي للصندوق</option>
              <option value="card">بطاقة</option>
              <option value="transfer">تحويل</option>
              <option value="credit">رصيد للعميل</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold">مصير البضاعة</label>
            <select value={restockTo} onChange={e => setRestockTo(e.target.value)} className="w-full border rounded-xl px-3 py-2 bg-slate-50 mt-1">
              <option value="good">إعادة للمخزون الصالح</option>
              <option value="damaged">تحويل إلى تالف/معزول</option>
            </select>
          </div>
        </div>
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="text-xs">إجمالي المبلغ المرتجع</div>
          <div className="text-2xl font-black text-amber-700">{refundTotal.toLocaleString("ar-SA")} SAR</div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={submit} disabled={submitting || refundTotal === 0} className="bg-amber-600 text-white px-6 py-2 rounded-xl font-bold">تأكيد الإرجاع</button>
          <button onClick={() => router.back()} className="border px-6 py-2 rounded-xl">إلغاء</button>
        </div>
      </div>
    </AppShell>
  );
}
