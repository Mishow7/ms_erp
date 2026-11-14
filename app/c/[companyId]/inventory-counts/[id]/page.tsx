"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/Shell";
import Link from "next/link";

export default function CountDetail() {
  const params = useParams<{ companyId: string; id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const load = () => fetch(`/api/inventory/counts/${params.id}`).then(r => r.json()).then(d => { setData(d); const init: any = {}; (d.items || []).forEach((it: any) => { init[it.id] = it.countedQty ?? it.systemQty; }); setEdits(init); });
  useEffect(() => { load(); }, [params.id]);
  if (!data) return <AppShell companyId={params.companyId}><div className="p-10 text-center">جاري التحميل...</div></AppShell>;
  const c = data.count; const items = data.items;

  const submit = async () => {
    setSaving(true);
    const payload = items.map((it: any) => ({ id: it.id, countedQty: edits[it.id] ?? it.systemQty }));
    const r1 = await fetch(`/api/inventory/counts/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit_counted", items: payload }) });
    const r2 = await fetch(`/api/inventory/counts/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit_for_approval" }) });
    setSaving(false);
    if (r1.ok && r2.ok) { alert("تم إرسال النقطة للاعتماد"); load(); } else alert("خطأ");
  };

  const approve = async () => {
    if (!confirm("اعتماد نقطة الجرد؟ لن يمكن تعديل اللقطة بعد ذلك.")) return;
    const r = await fetch(`/api/inventory/counts/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve" }) });
    const j = await r.json();
    if (r.ok) { alert("تم الاعتماد"); load(); } else alert(j.error);
  };

  const createAdjustment = async () => {
    const r = await fetch("/api/inventory/adjustments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ countId: params.id }) });
    const j = await r.json();
    if (r.ok) router.push(`/c/${params.companyId}/inventory-adjustments/${j.adjustment.id}`);
    else alert(j.error);
  };

  const diffs = items.filter((it: any) => (edits[it.id] ?? it.systemQty) - it.systemQty !== 0);

  return (
    <AppShell companyId={params.companyId}>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">نقطة جردية {c.countNumber}</h1>
      <p className="text-xs text-slate-500">الحالة: {c.status} • اللقطة: {new Date(c.snapshotAt).toLocaleString("ar-SA")}</p>
      <div className="flex gap-2 mt-2">
        {c.status === "approved" && <Link href={`/c/${params.companyId}/inventory-adjustments/new?countId=${c.id}`} className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold">إنشاء تسوية من هذه النقطة</Link>}
        {c.status === "approved" && <button onClick={createAdjustment} className="bg-white border px-4 py-2 rounded-xl text-sm">تسوية سريعة</button>}
        {c.status === "pending_approval" && <button onClick={approve} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold">اعتماد النقطة</button>}
        {c.status === "draft" && <button onClick={submit} disabled={saving} className="bg-[#0f2a54] text-white px-4 py-2 rounded-xl text-sm font-bold">حفظ وإرسال للاعتماد</button>}
      </div>

      <div className="bg-white border rounded-2xl p-4 mt-3">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50"><th className="p-2 text-right">المنتج</th><th className="p-2 text-right">SKU</th><th className="p-2">الكمية بالنظام</th><th className="p-2">الكمية المعدودة</th><th className="p-2">الفرق</th></tr></thead>
          <tbody>
            {items.map((it: any) => {
              const diff = (edits[it.id] ?? it.systemQty) - it.systemQty;
              return (
                <tr key={it.id} className={`border-t ${diff !== 0 ? "bg-amber-50/40" : ""}`}>
                  <td className="p-2">{it.productName}</td>
                  <td className="p-2 text-xs font-mono">{it.productSku || "—"}</td>
                  <td className="p-2 text-center font-bold">{it.systemQty}</td>
                  <td className="p-2 text-center">
                    <input type="number" min="0" disabled={c.status !== "draft"} value={edits[it.id] ?? it.systemQty} onChange={e => setEdits({ ...edits, [it.id]: parseInt(e.target.value) || 0 })} className="w-20 border rounded px-2 py-1 text-center" />
                  </td>
                  <td className={`p-2 text-center font-bold ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-slate-400"}`}>{diff > 0 ? "+" : ""}{diff}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="text-xs text-slate-500 mt-3">عدد الفروقات: {diffs.length}</div>
      </div>
    </AppShell>
  );
}
