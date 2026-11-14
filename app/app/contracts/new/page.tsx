"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Brand } from "@/components/Brand";

function RedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

  useEffect(() => {
    // Try to find user's first company and redirect to /c/[id]/contracts/new
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        if (cancelled) return;
        if (!meRes.ok) {
          // not logged in - go to login
          router.replace("/login?redirect=" + encodeURIComponent("/app/contracts/new"));
          return;
        }
        const me = await meRes.json();
        const companies = me.companies || [];
        if (companies.length === 0) {
          setError("لا توجد شركات مرتبطة بحسابك بعد.");
          setHint("إن كنت مالك المنصة، أنشئ شركة من /platform/companies — وإن كنت مستخدم شركة، اطلب من مدير الشركة إضافتك.");
          return;
        }
        const params = new URLSearchParams();
        const c = searchParams?.get("customerId");
        const i = searchParams?.get("invoiceId");
        if (c) params.set("customerId", c);
        if (i) params.set("invoiceId", i);
        const qs = params.toString() ? `?${params.toString()}` : "";
        router.replace(`/c/${companies[0].id}/contracts/new${qs}`);
      } catch (e: any) {
        setError("تعذّر تحديد الشركة: " + e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="bg-white border rounded-2xl p-8 max-w-[480px] text-center shadow">
        <div className="flex justify-center mb-4"><Brand small /></div>
        {error ? (
          <>
            <div className="text-5xl mb-2">⚠️</div>
            <div className="text-lg font-bold text-red-700">{error}</div>
            <div className="text-sm text-slate-500 mt-2 leading-6">{hint}</div>
            <div className="mt-4 flex gap-2 justify-center">
              <a href="/login" className="bg-[#0f2a54] text-white px-5 py-2 rounded-xl text-sm font-bold">تسجيل الدخول</a>
              <a href="/platform/companies" className="bg-slate-100 px-5 py-2 rounded-xl text-sm font-medium">إنشاء شركة</a>
            </div>
          </>
        ) : (
          <>
            <div className="text-5xl mb-2">⏳</div>
            <div className="text-lg font-bold text-[#0f2a54]">جاري التوجيه إلى نموذج العقد...</div>
            <div className="text-sm text-slate-500 mt-2">سيتم نقلك تلقائياً خلال لحظات</div>
          </>
        )}
        <div className="text-[11px] text-slate-400 mt-6">MS للأعمال البرمجية — إعداد وتنفيذ المهندس محمد ماجد العليمي</div>
      </div>
    </div>
  );
}

export default function AppContractsNewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">جاري التحميل...</div>}>
      <RedirectInner />
    </Suspense>
  );
}
