"use client";
import { Brand } from "@/components/Brand";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Clear session and go to login
  const handleReset = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    if (typeof window !== "undefined") {
      try {
        // Clear all cookies for current domain
        document.cookie.split(";").forEach(c => {
          const eqPos = c.indexOf("=");
          const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        });
        // Clear storage
        try { localStorage.clear(); } catch {}
        try { sessionStorage.clear(); } catch {}
      } catch {}
      window.location.href = "/login";
    }
  };

  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-50">
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-white border-2 border-red-200 rounded-2xl p-8 max-w-[520px] text-center shadow-lg">
            <div className="flex justify-center mb-4"><Brand small /></div>
            <div className="text-6xl mb-3">⚠️</div>
            <h1 className="text-2xl font-extrabold text-red-700 mb-2">حدث خطأ غير متوقع</h1>
            <p className="text-slate-600 leading-6 mb-3">
              تم اكتشاف مشكلة أثناء معالجة الطلب. السبب الأكثر احتمالاً هو انتهاء صلاحية الجلسة أو كاش قديم في المتصفح.
            </p>
            {error?.digest && <div className="text-[11px] text-slate-400 mb-3 font-mono">مرجع الخطأ: {error.digest}</div>}
            <div className="bg-slate-50 border rounded-xl p-3 text-right text-xs leading-6 text-slate-600 mb-4">
              <b>خطوات الإصلاح:</b>
              <ol className="list-decimal mr-5 mt-1 space-y-1">
                <li>اضغط "العودة لتسجيل الدخول" أدناه</li>
                <li>سجّل دخولك من جديد</li>
                <li>إن استمرت المشكلة، افتح الرابط في نافذة خاصة (Incognito)</li>
              </ol>
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={handleReset} className="bg-[#0f2a54] text-white px-6 py-3 rounded-xl font-bold">العودة لتسجيل الدخول</button>
              <button onClick={() => reset()} className="bg-slate-100 px-6 py-3 rounded-xl font-medium">إعادة المحاولة</button>
            </div>
            <div className="text-[11px] text-slate-400 mt-6">MS للأعمال البرمجية — إعداد وتنفيذ المهندس محمد ماجد العليمي</div>
          </div>
        </div>
      </body>
    </html>
  );
}
