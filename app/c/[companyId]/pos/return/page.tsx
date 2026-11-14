"use client";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import Link from "next/link";

export default function POSReturnsIndexPage() {
  const params = useParams<{ companyId: string }>();
  return (
    <AppShell companyId={params.companyId}>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">مرتجعات نقاط البيع</h1>
      <p className="text-xs text-slate-500">إنشاء مرتجع مرتبط بفاتورة نقاط بيع</p>
      <div className="mt-4 bg-white border rounded-2xl p-6 max-w-2xl">
        <div className="text-5xl mb-3 text-center">↩️</div>
        <div className="text-center font-bold mb-2">لإنشاء مرتجع، افتح الفاتورة الأصلية أولاً</div>
        <div className="text-center text-sm text-slate-500 mb-4">اذهب إلى قائمة فواتير نقاط البيع، ثم اضغط زر "إرجاع" في الفاتورة المطلوبة.</div>
        <div className="text-center">
          <Link href={`/c/${params.companyId}/pos-sales`} className="inline-block bg-[#0f2a54] text-white px-5 py-2 rounded-xl font-bold">📋 عرض فواتير نقاط البيع</Link>
        </div>
      </div>
    </AppShell>
  );
}
