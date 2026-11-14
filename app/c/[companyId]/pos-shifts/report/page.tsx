"use client";
import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import Link from "next/link";
import { printElement } from "@/lib/print";

function ReportInner() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const [shifts, setShifts] = useState<any[]>([]);
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("");
  const load = () => {
    fetch(`/api/pos/shifts?companyId=${companyId}`).then(r => r.json()).then(d => {
      const fromD = new Date(from); const toD = new Date(to + "T23:59:59");
      setShifts((d.shifts || []).filter((s: any) => new Date(s.openedAt) >= fromD && new Date(s.openedAt) <= toD && (!status || s.status === status)));
    });
  };
  useEffect(() => { load(); }, [companyId, from, to, status]);
  return (
    <AppShell companyId={companyId}>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">تقرير الورديات</h1>
      <p className="text-xs text-slate-500">تصفية حسب الفترة والحالة — طباعة وتصدير</p>
      <div className="flex flex-wrap gap-2 bg-white border rounded-2xl p-3 mt-3">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border rounded-lg px-2 py-1 text-sm" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border rounded-lg px-2 py-1 text-sm" />
        <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded-lg px-2 py-1 text-sm">
          <option value="">الكل</option><option value="open">مفتوحة</option><option value="closed">مغلقة</option>
        </select>
        <button onClick={load} className="bg-[#0f2a54] text-white px-4 py-1.5 rounded-lg text-sm">تحديث</button>
        <button onClick={() => printElement("print-shifts-report", { title: "تقرير الورديات", paper: "A4", orientation: "landscape" })} className="bg-white border px-4 py-1.5 rounded-lg text-sm no-print">🖨️ طباعة/PDF</button>
        <Link href={`/c/${companyId}/pos-shifts`} className="bg-slate-100 px-4 py-1.5 rounded-lg text-sm no-print">إدارة الورديات</Link>
      </div>
      <div className="bg-white border rounded-2xl p-4 mt-3 print-area" id="print-shifts-report">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50"><th className="p-2 text-right">المستخدم</th><th className="p-2 text-right">الصندوق</th><th className="p-2 text-right">فتح</th><th className="p-2 text-right">إغلاق</th><th className="p-2 text-right">البداية</th><th className="p-2 text-right">المتوقع</th><th className="p-2 text-right">الفعلي</th><th className="p-2 text-right">الفرق</th><th className="p-2 text-right">الحالة</th></tr></thead>
          <tbody>{shifts.map(s => (
            <tr key={s.id} className="border-t">
              <td className="p-2 font-bold">{s.userName}</td>
              <td className="p-2 text-xs">{s.registerName || "—"}</td>
              <td className="p-2 text-xs">{new Date(s.openedAt).toLocaleString("ar-SA")}</td>
              <td className="p-2 text-xs">{s.closedAt ? new Date(s.closedAt).toLocaleString("ar-SA") : "—"}</td>
              <td className="p-2">{parseFloat(s.openingCash).toLocaleString("ar-SA")}</td>
              <td className="p-2">{s.expectedCash ? parseFloat(s.expectedCash).toLocaleString("ar-SA") : "—"}</td>
              <td className="p-2">{s.closingCash ? parseFloat(s.closingCash).toLocaleString("ar-SA") : "—"}</td>
              <td className={`p-2 font-bold ${s.difference && parseFloat(s.difference) < 0 ? "text-red-600" : "text-emerald-600"}`}>{s.difference ? parseFloat(s.difference).toLocaleString("ar-SA") : "—"}</td>
              <td className="p-2"><span className={`text-[10px] px-2 py-0.5 rounded-full ${s.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100"}`}>{s.status === "open" ? "مفتوحة" : "مغلقة"}</span></td>
            </tr>
          ))}{shifts.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-slate-400">لا ورديات في الفترة</td></tr>}</tbody>
        </table>
      </div>
      <div className="text-[11px] text-center text-slate-400 mt-3 border-t pt-3 no-print">MS للأعمال البرمجية — إعداد وتنفيذ المهندس محمد ماجد العليمي</div>
    </AppShell>
  );
}

export default function Page() {
  const params = useParams<{ companyId: string }>();
  return <Suspense fallback={<div className="p-10 text-center">جاري التحميل...</div>}><ReportInner /></Suspense>;
}
