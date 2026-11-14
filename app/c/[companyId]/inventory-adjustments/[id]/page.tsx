"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/Shell";

export default function AdjustmentDetail() {
  const params = useParams<{ companyId: string; id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const load = () => fetch(`/api/inventory/adjustments/${params.id}`).then(r => r.json()).then(setData);
  useEffect(() => { load(); }, [params.id]);
  if (!data) return <AppShell companyId={params.companyId}><div className="p-10 text-center">جاري التحميل...</div></AppShell>;
  const adj = data.adjustment; const items = data.items;

  const submit = async () => {
    const r = await fetch(`/api/inventory/adjustments/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit_for_approval" }) });
    if (r.ok) { alert("أرسلت للاعتماد"); load(); } else alert("خطأ");
  };
  const approve = async () => {
    if (!confirm("اعتماد التسوية؟ سيتم تحديث المخزون فورياً.")) return;
    const r = await fetch(`/api/inventory/adjustments/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve" }) });
    const j = await r.json();
    if (r.ok) { alert("تم الاعتماد وتحديث المخزون"); load(); } else alert(j.error);
  };

  return (
    <AppShell companyId={params.companyId}>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">تسوية جردية {adj.adjustmentNumber}</h1>
      <p className="text-xs text-slate-500">الحالة: {adj.status} • من نقطة {adj.countId.slice(0, 8)}</p>
      <div className="flex gap-2 mt-2">
        {adj.status === "draft" && <button onClick={submit} className="bg-[#0f2a54] text-white px-4 py-2 rounded-xl text-sm font-bold">إرسال للاعتماد</button>}
        {adj.status === "pending_approval" && <button onClick={approve} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold">اعتماد وتطبيق</button>}
      </div>
      <div className="bg-white border rounded-2xl p-4 mt-3">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50"><th className="p-2 text-right">المنتج</th><th className="p-2">النظام</th><th className="p-2">المعدود</th><th className="p-2">الفرق</th><th className="p-2">المصير</th><th className="p-2">القيمة</th></tr></thead>
          <tbody>
            {items.map((it: any) => (
              <tr key={it.id} className="border-t">
                <td className="p-2">{it.productName}</td>
                <td className="p-2 text-center">{it.systemQty}</td>
                <td className="p-2 text-center font-bold">{it.countedQty}</td>
                <td className={`p-2 text-center font-bold ${it.difference > 0 ? "text-emerald-600" : "text-red-600"}`}>{it.difference > 0 ? "+" : ""}{it.difference}</td>
                <td className="p-2 text-center"><span className={`text-xs px-2 py-1 rounded-full ${it.restockTo === "good" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{it.restockTo === "good" ? "صالح" : "تالف"}</span></td>
                <td className="p-2 text-center text-xs">{parseFloat(it.costValue).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {adj.status === "approved" && <div className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2">✓ معتمدة — تم تحديث أرصدة المخزون وتسجيل الحركات</div>}
      </div>
    </AppShell>
  );
}
