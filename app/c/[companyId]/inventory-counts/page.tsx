"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import Link from "next/link";

export default function InventoryCountsPage() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const [counts, setCounts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ warehouseId: "", category: "", countedBy: "", notes: "" });
  const load = () => {
    fetch(`/api/inventory/counts?companyId=${companyId}`).then(r => r.json()).then(d => setCounts(d.counts || []));
    fetch(`/api/pos/setup?companyId=${companyId}`).then(r => r.json()).then(d => setWarehouses(d.warehouses || []));
  };
  useEffect(() => { load(); }, [companyId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/inventory/counts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, ...form }) });
    const j = await r.json();
    if (r.ok) { setShow(false); router_(); }
    else alert(j.error);
  };
  const router_ = () => load();

  return (
    <AppShell companyId={companyId}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-[#0f2a54]">الجرد والتسويات الجردية</h1>
        <button onClick={() => setShow(true)} className="bg-[#0f2a54] text-white px-5 py-2 rounded-xl font-bold text-sm">+ نقطة جردية جديدة</button>
      </div>
      <p className="text-xs text-slate-500">دورة من مرحلتين: نقطة جردية → اعتماد → تسوية → اعتماد. التسوية لا تعدل المخزون قبل الاعتماد.</p>

      <div className="bg-white border rounded-2xl p-4 mt-3">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-600"><th className="p-3 text-right">رقم النقطة</th><th className="p-3 text-right">المستودع</th><th className="p-3 text-right">التصنيف</th><th className="p-3 text-right">اللقطة</th><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">إجراءات</th></tr></thead>
          <tbody>
            {counts.map(c => (
              <tr key={c.id} className="border-t hover:bg-slate-50">
                <td className="p-3 font-mono font-bold">{c.countNumber}</td>
                <td className="p-3 text-xs">{warehouses.find(w => w.id === c.warehouseId)?.name || "—"}</td>
                <td className="p-3 text-xs">{c.category || "كل التصنيفات"}</td>
                <td className="p-3 text-xs">{new Date(c.snapshotAt).toLocaleString("ar-SA")}</td>
                <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${c.status === "approved" ? "bg-emerald-100 text-emerald-700" : c.status === "pending_approval" ? "bg-amber-100 text-amber-800" : "bg-slate-100"}`}>{c.status === "draft" ? "مسودة" : c.status === "pending_approval" ? "بانتظار الاعتماد" : c.status === "approved" ? "معتمدة" : "ملغية"}</span></td>
                <td className="p-3"><Link href={`/c/${companyId}/inventory-counts/${c.id}`} className="text-xs bg-[#0f2a54] text-white px-3 py-1 rounded-full">فتح</Link></td>
              </tr>
            ))}
            {counts.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا توجد نقاط جردية</td></tr>}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={create} className="bg-white rounded-2xl w-full max-w-[500px] p-6">
            <h2 className="font-bold text-[#0f2a54]">نقطة جردية جديدة</h2>
            <p className="text-xs text-slate-500">سيتم حفظ لقطة أرصدة النظام فوراً</p>
            <div className="space-y-2 mt-4">
              <select required value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })} className="w-full border rounded-xl px-3 py-2 bg-slate-50">
                <option value="">اختر المستودع *</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <input placeholder="تصنيف (اختياري — اتركه فارغاً للكل)" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border rounded-xl px-3 py-2 bg-slate-50" />
              <input placeholder="اسم العادّ" value={form.countedBy} onChange={e => setForm({ ...form, countedBy: e.target.value })} className="w-full border rounded-xl px-3 py-2 bg-slate-50" />
              <textarea placeholder="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-xl p-3 bg-slate-50" />
            </div>
            <div className="flex gap-2 mt-4"><button type="submit" className="flex-1 bg-[#0f2a54] text-white py-2.5 rounded-xl font-bold">إنشاء وحفظ اللقطة</button><button type="button" onClick={() => setShow(false)} className="flex-1 border py-2.5 rounded-xl">إلغاء</button></div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
