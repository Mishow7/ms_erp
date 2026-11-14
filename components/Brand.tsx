import Image from "next/image";

export function Brand({ small = false, showText = true }: { small?: boolean; showText?: boolean }) {
  const size = small ? 36 : 48;
  return (
    <div className="flex items-center gap-3">
      <div className="relative rounded-lg overflow-hidden shadow-md" style={{ width: size, height: size }}>
        <Image src="/images/ms-logo.png" alt="MS للأعمال البرمجية" width={size} height={size} className="object-cover" priority />
      </div>
      {showText && (
        <div>
          <div className={`font-extrabold text-[#0f2a54] leading-none ${small ? "text-[15px]" : "text-[17px]"}`}>MS للأعمال البرمجية</div>
          <div className="text-[11px] text-slate-500 font-medium">إعداد وتنفيذ المهندس محمد ماجد العليمي</div>
        </div>
      )}
    </div>
  );
}

export function BrandFooter() {
  return (
    <div className="text-center py-6 border-t bg-white/60 backdrop-blur">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Image src="/images/ms-logo.png" alt="MS" width={28} height={28} className="rounded" />
        <div className="text-sm font-bold text-[#0f2a54]">MS للأعمال البرمجية</div>
      </div>
      <div className="text-xs text-slate-500">إعداد وتنفيذ المهندس محمد ماجد العليمي — جميع الحقوق محفوظة © 2025</div>
      <div className="text-[11px] text-slate-400 mt-1">نظام ERP سحابي متكامل • آمن • متعدد الشركات</div>
    </div>
  );
}
