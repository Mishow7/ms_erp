"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { printElement } from "@/lib/print";
import { AppShell } from "@/components/Shell";

const DEFAULT_TEMPLATE = {
  paperSize: "A4",
  orientation: "portrait",
  cols: 3,
  rows: 8,
  marginMM: 5,
  labelWidthMM: 65,
  labelHeightMM: 35,
  showName: true,
  showBarcode: true,
  showSku: true,
  showPrice: true,
  showUnit: false,
  fontSize: 10,
};

function renderBarcode(text: string) {
  // barcode visual simulation - strips
  if (!text) return null;
  const bars: number[] = [];
  let seed = 0;
  for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) & 0xffff;
  for (let i = 0; i < 50; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const w = (seed % 3) + 1;
    bars.push(w);
  }
  return (
    <div className="flex h-8 items-end gap-[1px]">
      {bars.map((w, i) => (
        <div key={i} className="bg-black" style={{ width: w, height: i % 2 ? "100%" : "80%" }}></div>
      ))}
    </div>
  );
}

export default function BarcodeLabelsPage() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const [products, setProducts] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [template, setTemplate] = useState<any>(DEFAULT_TEMPLATE);

  useEffect(() => {
    fetch(`/api/pos/setup?companyId=${companyId}`).then(r => r.json()).then(d => setProducts(d.products || []));
    const raw = localStorage.getItem(`barcode_template_${companyId}`);
    if (raw) try { setTemplate({ ...DEFAULT_TEMPLATE, ...JSON.parse(raw) }); } catch {}
  }, [companyId]);

  const saveTemplate = () => {
    localStorage.setItem(`barcode_template_${companyId}`, JSON.stringify(template));
    alert("تم حفظ القالب");
  };
  const reset = () => { setTemplate(DEFAULT_TEMPLATE); localStorage.removeItem(`barcode_template_${companyId}`); };
  const toggleAll = (qty: number) => {
    const sel: any = {};
    products.forEach(p => { if (p.barcode || p.sku) sel[p.id] = qty; });
    setSelected(sel);
  };

  const labelsToPrint: any[] = [];
  for (const p of products) {
    const q = selected[p.id] || 0;
    for (let i = 0; i < q; i++) labelsToPrint.push(p);
  }

  return (
    <AppShell companyId={companyId}>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">قوالب ملصقات الباركود</h1>
      <p className="text-xs text-slate-500">إعداد قالب ملصقات الباركود لكل شركة على حدة</p>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="bg-white border rounded-2xl p-5">
          <div className="font-bold mb-3">إعدادات القالب</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><label className="text-xs">حجم الورق</label>
              <select value={template.paperSize} onChange={e => setTemplate({ ...template, paperSize: e.target.value })} className="w-full border rounded-xl px-2 py-1 bg-slate-50">
                <option>A4</option><option>Letter</option><option>Roll (50mm)</option><option>Roll (80mm)</option>
              </select>
            </div>
            <div><label className="text-xs">الاتجاه</label>
              <select value={template.orientation} onChange={e => setTemplate({ ...template, orientation: e.target.value })} className="w-full border rounded-xl px-2 py-1 bg-slate-50">
                <option value="portrait">عمودي</option><option value="landscape">أفقي</option>
              </select>
            </div>
            <div><label className="text-xs">عدد الأعمدة</label><input type="number" min="1" max="6" value={template.cols} onChange={e => setTemplate({ ...template, cols: parseInt(e.target.value) || 1 })} className="w-full border rounded-xl px-2 py-1 bg-slate-50" /></div>
            <div><label className="text-xs">عدد الصفوف</label><input type="number" min="1" max="20" value={template.rows} onChange={e => setTemplate({ ...template, rows: parseInt(e.target.value) || 1 })} className="w-full border rounded-xl px-2 py-1 bg-slate-50" /></div>
            <div><label className="text-xs">هامش (مم)</label><input type="number" min="0" value={template.marginMM} onChange={e => setTemplate({ ...template, marginMM: parseInt(e.target.value) || 0 })} className="w-full border rounded-xl px-2 py-1 bg-slate-50" /></div>
            <div><label className="text-xs">حجم الخط</label><input type="number" min="6" max="20" value={template.fontSize} onChange={e => setTemplate({ ...template, fontSize: parseInt(e.target.value) || 10 })} className="w-full border rounded-xl px-2 py-1 bg-slate-50" /></div>
          </div>
          <div className="text-xs font-bold mt-3 mb-1">الحقول المعروضة</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {[["showName","اسم المنتج"],["showBarcode","الباركود"],["showSku","SKU"],["showPrice","السعر"],["showUnit","الوحدة"]].map(([k,l]) => (
              <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={!!template[k]} onChange={e => setTemplate({ ...template, [k]: e.target.checked })} />{l}</label>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={saveTemplate} className="flex-1 bg-[#0f2a54] text-white py-2 rounded-xl font-bold">حفظ القالب</button>
            <button onClick={reset} className="bg-slate-100 px-4 py-2 rounded-xl text-sm">استعادة الافتراضي</button>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5">
          <div className="font-bold mb-2">اختيار المنتجات والكميات</div>
          <div className="flex gap-2 mb-2">
            <button onClick={() => toggleAll(1)} className="text-xs bg-slate-100 px-3 py-1 rounded">تحديد كل منتج بملصق</button>
            <button onClick={() => setSelected({})} className="text-xs bg-slate-100 px-3 py-1 rounded">إلغاء التحديد</button>
          </div>
          <div className="max-h-[300px] overflow-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50"><th className="p-2 text-right">المنتج</th><th className="p-2 text-right">SKU/الباركود</th><th className="p-2">الكمية</th></tr></thead>
              <tbody>{products.map(p => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">{p.name}</td>
                  <td className="p-2 font-mono text-[10px]">{p.sku || p.barcode || "—"}</td>
                  <td className="p-2 text-center"><input type="number" min="0" value={selected[p.id] || 0} onChange={e => setSelected({ ...selected, [p.id]: parseInt(e.target.value) || 0 })} className="w-16 border rounded px-1 text-center" /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="text-xs text-slate-500 mt-2">إجمالي الملصقات: <b>{labelsToPrint.length}</b></div>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-5 mt-4">
        <div className="flex justify-between items-center mb-3">
          <div className="font-bold">معاينة وطباعة</div>
          <button onClick={() => printElement("print-labels", { title: "ملصقات الباركود", paper: template.paperSize === "A4" ? "A4" : "receipt", orientation: template.orientation, styles: `#print-labels { background:#fff !important; padding:0 !important; } #print-labels > div { box-shadow:none !important; }` })} className="bg-[#0f2a54] text-white px-4 py-2 rounded-xl text-sm font-bold no-print">🖨️ طباعة الملصقات</button>
        </div>
        <div id="print-labels" className="print-area bg-slate-100 p-4 rounded-xl" style={{ direction: "ltr" }}>
          <div className="bg-white mx-auto shadow" style={{ padding: `${template.marginMM}px`, display: "grid", gridTemplateColumns: `repeat(${template.cols}, 1fr)`, gap: "4px", maxWidth: "fit-content" }}>
            {labelsToPrint.length === 0 && <div className="text-center text-slate-400 text-sm p-6 col-span-full">حدد منتجات لطباعة ملصقاتها</div>}
            {labelsToPrint.map((p, i) => (
              <div key={i} className="border-2 border-dashed border-slate-300 p-2 text-center" style={{ minWidth: "80px" }}>
                {template.showName && <div className="font-bold truncate" style={{ fontSize: `${template.fontSize}px` }}>{p.name}</div>}
                {template.showBarcode && (p.barcode || p.sku) && <div className="my-1">{renderBarcode(p.barcode || p.sku)}</div>}
                {template.showSku && <div className="font-mono" style={{ fontSize: `${template.fontSize - 1}px` }}>{p.sku || "—"}</div>}
                {template.showPrice && <div className="font-black" style={{ fontSize: `${template.fontSize + 1}px` }}>{parseFloat(p.price).toFixed(2)} SAR</div>}
                {template.showUnit && <div style={{ fontSize: `${template.fontSize - 2}px` }} className="text-slate-500">{p.unit}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <style jsx global>{`@media print { .no-print { display: none !important; } #labels-sheet { background: white !important; } }`}</style>
    </AppShell>
  );
}
