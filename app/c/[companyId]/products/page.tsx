"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/Shell";
import { useParams } from "next/navigation";

export default function ProductsPage() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const [products, setProducts] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ name: "", sku: "", category: "", unit: "قطعة", price: "", cost: "", stock: 0, taxRate: 15 });

  const load = () => fetch(`/api/products?companyId=${companyId}&q=${q}`).then(r => r.json()).then(d => setProducts(d.products || []));
  useEffect(() => { load(); }, [companyId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, ...form }) });
    if (r.ok) { setShow(false); setForm({ name: "", sku: "", category: "", unit: "قطعة", price: "", cost: "", stock: 0, taxRate: 15 }); load(); } else alert("خطأ");
  };

  return (
    <AppShell companyId={companyId}>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#0f2a54]">المنتجات والمخزون</h1>
          <p className="text-xs text-slate-500">تتبع الأرصدة والتنبيهات وكامل حركة الصنف</p>
        </div>
        <button onClick={() => setShow(true)} className="bg-[#0f2a54] text-white px-5 py-2.5 rounded-xl font-bold text-sm">+ منتج جديد</button>
      </div>

      <div className="mt-4 bg-white border rounded-2xl p-4">
        <div className="flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث باسم المنتج..." className="flex-1 border rounded-xl px-4 py-2.5 bg-slate-50" />
          <button onClick={load} className="bg-slate-900 text-white px-5 rounded-xl text-sm">بحث</button>
        </div>

        <div className="grid md:grid-cols-3 gap-3 mt-4">
          {products.map(p => (
            <div key={p.id} className="border rounded-2xl p-4 hover:shadow-sm bg-white">
              <div className="flex justify-between">
                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-sm">📦</div>
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${p.stock <= (p.minStock || 5) ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{p.stock <= (p.minStock || 5) ? "تنبيه: حد إعادة الطلب" : "متوفر"}</span>
              </div>
              <div className="font-bold mt-2">{p.name}</div>
              <div className="text-xs text-slate-500">SKU: {p.sku || "—"} • {p.category || "بدون تصنيف"} • {p.unit}</div>
              <div className="mt-3 flex justify-between items-end">
                <div><div className="text-xs text-slate-500">سعر البيع</div><div className="font-black text-[#0f2a54]">{parseFloat(p.price).toLocaleString("ar-SA")} SAR</div></div>
                <div className="text-left"><div className="text-xs text-slate-500">الرصيد</div><div className="font-bold">{p.stock} {p.unit}</div></div>
              </div>
              <div className="text-xs text-slate-400 mt-2">ضريبة: {p.taxRate}% • تكلفة: {parseFloat(p.cost || "0").toLocaleString("ar-SA")}</div>
            </div>
          ))}
        </div>
        {products.length === 0 && <div className="text-center text-slate-400 py-10">لا توجد منتجات — أضف منتجاً لتجربة الفاتورة</div>}

        <div className="overflow-auto mt-6">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-slate-600"><th className="p-3 text-right">المنتج</th><th className="p-3 text-right">الفئة</th><th className="p-3 text-right">السعر</th><th className="p-3 text-right">المخزون</th><th className="p-3 text-right">الحالة</th></tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-medium">{p.name}<div className="text-xs text-slate-500">{p.sku}</div></td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3 font-bold">{parseFloat(p.price).toLocaleString("ar-SA")} SAR</td>
                  <td className="p-3">{p.stock}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${p.stock <= 5 ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{p.stock <= 5 ? "حد الطلب" : "جيد"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={create} className="bg-white rounded-2xl w-full max-w-[520px] p-6 max-h-[85vh] overflow-auto">
            <h2 className="font-bold text-[#0f2a54]">إضافة منتج / خدمة</h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <input required placeholder="اسم المنتج *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="col-span-2 border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input placeholder="SKU / باركود" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input placeholder="الفئة" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input placeholder="سعر البيع *" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input placeholder="التكلفة" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input type="number" placeholder="الكمية" value={form.stock} onChange={e => setForm({ ...form, stock: parseInt(e.target.value) })} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="border rounded-xl px-3 py-2.5 bg-slate-50"><option>قطعة</option><option>كغ</option><option>م²</option><option>طن</option><option>خدمة</option><option>ترخيص</option></select>
            </div>
            <div className="flex gap-2 mt-6"><button type="submit" className="flex-1 bg-[#0f2a54] text-white py-2.5 rounded-xl font-bold">حفظ</button><button type="button" onClick={() => setShow(false)} className="flex-1 border py-2.5 rounded-xl">إلغاء</button></div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
