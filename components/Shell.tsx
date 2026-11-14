"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";

type User = { userId: string; name: string; email: string; platformRole: string };
type Company = { id: string; name: string; memberRole?: string };

export function AppShell({ children, companyId }: { children: React.ReactNode; companyId?: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      setUser(d.user);
      if (d.companies) setCompanies(d.companies);
      if (!d.user) router.push("/login");
    });
  }, []);

  // Load collapse state
  useEffect(() => {
    const v = localStorage.getItem("ms_sidebar_collapsed");
    if (v === "1") setCollapsed(true);
  }, []);
  useEffect(() => { localStorage.setItem("ms_sidebar_collapsed", collapsed ? "1" : "0"); }, [collapsed]);

  // Close mobile on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        user={user}
        companies={companies}
        onLogout={logout}
      />

      <div className={`flex-1 transition-all duration-200 ${collapsed ? "lg:mr-[72px]" : "lg:mr-[280px]"}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-xl bg-slate-100">☰</button>
            <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 items-center justify-center text-slate-600" title="طي/توسيع القائمة">
              <span className="text-xs">{collapsed ? "»" : "«"}</span>
            </button>
            <Breadcrumbs />
            <div className="mr-auto flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span>MS للأعمال البرمجية — Multi-Tenant SaaS</span>
              </div>
              <Link href="/c/_/about" className="w-8 h-8 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center" title="حول النظام">ℹ️</Link>
            </div>
          </div>
          <div className="bg-gradient-to-r from-[#0f2a54] via-[#1e3a7a] to-[#2563eb] text-white text-[11px] px-4 py-1 flex items-center justify-between">
            <span>MS للأعمال البرمجية — نظام ERP السحابي المتكامل</span>
            <span className="opacity-90 hidden sm:inline">إعداد وتنفيذ المهندس محمد ماجد العليمي</span>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-[1400px] mx-auto">
          {children}
          <div className="mt-10 text-center text-xs text-slate-400 py-6 border-t">
            MS للأعمال البرمجية — إعداد وتنفيذ المهندس محمد ماجد العليمي • واجهة عربية RTL • SaaS Multi-Tenant
          </div>
        </main>
      </div>

      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}

function Breadcrumbs() {
  const pathname = usePathname();
  const companyMatch = pathname.match(/^\/c\/([^\/]+)/);
  const companyId = companyMatch?.[1];
  const isPlatform = !companyId;
  const tail = pathname.replace(/^\/(platform|c\/[^\/]+)/, "").split("/").filter(Boolean);

  if (isPlatform) {
    return (
      <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
        <Link href="/platform" className="hover:text-[#0f2a54]">المنصة</Link>
        {tail.length > 0 && <span className="text-slate-400">/</span>}
        {tail.map((seg, i) => (
          <span key={i} className={i === tail.length - 1 ? "font-bold text-[#0f2a54]" : ""}>
            {decodeURIComponent(seg)}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
      <Link href={`/c/${companyId}`} className="hover:text-[#0f2a54] truncate max-w-[180px]">الشركة</Link>
      {tail.length > 0 && <><span className="text-slate-400">/</span>
        {tail.map((seg, i) => (
          <span key={i} className={i === tail.length - 1 ? "font-bold text-[#0f2a54]" : ""}>
            {decodeURIComponent(seg)}
          </span>
        ))}
      </>}
    </div>
  );
}
