"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/Shell";
import Image from "next/image";

export default function AboutPage() {
  const params = useParams<{ companyId: string }>(); const companyId = params.companyId;
  const [company, setCompany] = useState<any>(null);
  useEffect(() => {
    fetch(`/api/companies`).then(r=>r.json()).then(d => {
      if (d.companies) setCompany(d.companies.find((c:any) => c.id === companyId));
    });
  }, [companyId]);

  return (
    <AppShell companyId={companyId}>
      <h1 className="text-xl font-extrabold text-[#0f2a54]">حول النظام</h1>

      <div className="mt-6 bg-white border rounded-2xl p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-2xl overflow-hidden shadow-lg" style={{ width: 160, height: 100 }}>
            <Image src="/images/ms-logo.png" alt="MS للأعمال البرمجية" width={160} height={100} className="object-cover" priority />
          </div>
        </div>
        <h2 className="text-2xl font-extrabold text-[#0f2a54]">MS للأعمال البرمجية</h2>
        <p className="text-sm text-slate-500 mt-1">إعداد وتنفيذ المهندس محمد ماجد العليمي</p>
        <p className="text-xs text-slate-400 mt-2">نظام ERP سحابي متعدد الشركات • آمن • متعدد المستأجرين</p>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-2xl p-5">
          <div className="font-bold text-[#0f2a54]">🔗 رابط النظام الرسمي</div>
          <a href="https://www.sm-soft.com" target="_blank" rel="noopener" className="mt-2 inline-block bg-[#0f2a54] text-white px-5 py-2.5 rounded-xl font-bold hover:underline">
            https://www.sm-soft.com
          </a>
          <div className="text-[11px] text-slate-500 mt-2">
            هذا هو الرابط الرسمي للمنصة. لمشاركة رابط النظام أو تسجيل الدخول، استخدم هذا الرابط بدلاً من رابط المعاينة.
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5">
          <div className="font-bold text-[#0f2a54]">🏢 الشركة الحالية</div>
          {company ? (
            <div className="mt-2 text-sm space-y-1">
              <div><b>الاسم:</b> {company.name}</div>
              <div><b>العملة:</b> {company.currency}</div>
              <div><b>الباقة:</b> {company.plan}</div>
              <div><b>المعرّف:</b> <span className="font-mono text-xs">{company.id}</span></div>
            </div>
          ) : <div className="text-xs text-slate-500">جاري التحميل...</div>}
        </div>
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm">
        <div className="font-bold text-amber-800">📌 ملاحظة حول النطاق الرسمي</div>
        <p className="text-amber-900 mt-2 leading-6">
          ربط النطاق <b>www.sm-soft.com</b> يتطلب إجراءً خارجياً (DNS + استضافة) خارج هذه الواجهة. النظام يعمل حالياً على بيئة معاينة، وعند نشره على الاستضافة الرسمية وربط الدومين، كل المسارات الداخلية ووظائف تسجيل الدخول تبقى كما هي دون أي تغيير.
        </p>
      </div>

      <div className="mt-6 bg-white border rounded-2xl p-5 text-xs text-slate-500">
        <div className="font-bold text-[#0f2a54] text-sm">معلومات تقنية</div>
        <div className="grid md:grid-cols-2 gap-2 mt-2">
          <div>• الإصدار: 1.0</div>
          <div>• البنية: Next.js 16 + Drizzle ORM + PostgreSQL</div>
          <div>• عدد الوحدات: 8+ وحدات</div>
          <div>• الأمان: عزل بيانات الشركات، RBAC، سجل تدقيق</div>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-400 mt-6">MS للأعمال البرمجية — إعداد وتنفيذ المهندس محمد ماجد العليمي — جميع الحقوق محفوظة © 2025</div>
    </AppShell>
  );
}
