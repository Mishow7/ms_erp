"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./Brand";

type User = { userId: string; name: string; email: string; platformRole: string };
type Company = { id: string; name: string; memberRole?: string };

type NavItem = { href: string; label: string; icon: string; tag?: string; coming?: boolean };
type NavModule = { key: string; label: string; icon: string; items: NavItem[] };

// الصفحات الموجودة فعلياً في النظام حسب شركةId prefix
const companyModules: NavModule[] = [
  {
    key: "dashboard",
    label: "لوحة التحكم",
    icon: "📊",
    items: [
      { href: "", label: "الرئيسية والمؤشرات", icon: "🏠" },
      { href: "/tasks", label: "المهام والموافقات", icon: "✅" },
    ],
  },
  {
    key: "pos",
    label: "نقاط البيع",
    icon: "🛒",
    items: [
      { href: "/pos", label: "شاشة البيع", icon: "💳" },
      { href: "/pos-sales", label: "فواتير نقاط البيع", icon: "🧾" },
      { href: "/pos/return", label: "مرتجعات نقاط البيع", icon: "↩️" },
      { href: "/pos-shifts", label: "إدارة الورديات", icon: "🕐" },
      { href: "/barcode-labels", label: "طباعة الباركود", icon: "🏷️" },
      { href: "/reports-sales", label: "تقارير نقاط البيع", icon: "📈" },
    ],
  },
  {
    key: "sales",
    label: "المبيعات",
    icon: "🛍️",
    items: [
      { href: "/invoices", label: "فواتير البيع", icon: "🧾" },
      { href: "/customers", label: "العملاء", icon: "👥" },
      { href: "/contracts", label: "العقود", icon: "📄" },
      { href: "/contracts/new", label: "إنشاء عقد", icon: "➕" },
      { href: "/contracts?status=pending_approval", label: "عقود بانتظار الاعتماد", icon: "⏳" },
      { href: "/statements?tab=customer", label: "كشوف حساب العملاء", icon: "📋" },
      { href: "/reports-sales", label: "تقارير المبيعات", icon: "📈" },
    ],
  },
  {
    key: "purchases",
    label: "المشتريات",
    icon: "🛒",
    items: [
      { href: "/invoices?type=purchase", label: "فواتير الشراء", icon: "🧾" },
      { href: "/suppliers", label: "الموردون", icon: "🚚" },
      { href: "/statements?tab=supplier", label: "كشوف حساب الموردين", icon: "📋" },
    ],
  },
  {
    key: "inventory",
    label: "المخزون",
    icon: "📦",
    items: [
      { href: "/products", label: "المنتجات والأصناف", icon: "📦" },
      { href: "/inventory-counts", label: "النقاط الجردية", icon: "📋" },
      { href: "/inventory-adjustments", label: "التسويات الجردية", icon: "⚖️" },
      { href: "/branches", label: "المستودعات والفروع", icon: "🏢" },
      { href: "/reports-stock", label: "المخزون الراكد", icon: "⏰" },
      { href: "/barcode-labels", label: "طباعة ملصقات الباركود", icon: "🏷️" },
      { href: "/statements?tab=inventory", label: "حركات المخزون", icon: "🔁" },
      { href: "/statements?tab=stock-balances", label: "أرصدة المخزون", icon: "📊" },
    ],
  },
  {
    key: "finance",
    label: "المالية والحسابات",
    icon: "💰",
    items: [
      { href: "/finance", label: "سندات القبض والصرف والقيود", icon: "📄" },
      { href: "/finance?tab=cash", label: "الصناديق النقدية", icon: "💵" },
      { href: "/finance?tab=bank", label: "الحسابات البنكية", icon: "🏦" },
      { href: "/finance?tab=ledger", label: "دليل الحسابات", icon: "📚" },
      { href: "/statements?tab=register", label: "كشف حساب الصناديق", icon: "💰" },
      { href: "/statements?tab=bank", label: "كشف حساب البنوك", icon: "🏦" },
      { href: "/statements?tab=customer", label: "كشوف العملاء", icon: "👥" },
      { href: "/statements?tab=supplier", label: "كشوف الموردين", icon: "🚚" },
      { href: "/invoice-template", label: "قوالب الفواتير والطباعة", icon: "🖨️" },
    ],
  },
  {
    key: "contracts",
    label: "العقود",
    icon: "📄",
    items: [
      { href: "/contracts", label: "قائمة العقود", icon: "📋" },
      { href: "/contracts/new", label: "إنشاء عقد جديد", icon: "➕" },
      { href: "/contracts?status=pending_approval", label: "بانتظار الاعتماد", icon: "⏳" },
      { href: "/settings", label: "تذييل العقود وإعداداتها", icon: "🖋️" },
    ],
  },
  {
    key: "hr",
    label: "الموارد البشرية",
    icon: "👥",
    items: [
      { href: "/hr", label: "الموظفون", icon: "👤", coming: true },
      { href: "/hr/attendance", label: "الحضور والانصراف", icon: "🕒", coming: true },
      { href: "/hr/leaves", label: "الإجازات", icon: "🌴", coming: true },
      { href: "/hr/payroll", label: "الرواتب", icon: "💵", coming: true },
      { href: "/hr/reports", label: "تقارير الموارد البشرية", icon: "📊", coming: true },
    ],
  },
  {
    key: "reports",
    label: "التقارير",
    icon: "📈",
    items: [
      { href: "/reports-sales", label: "تقرير المبيعات", icon: "📈" },
      { href: "/reports-stock", label: "تقرير المخزون الراكد", icon: "⏰" },
      { href: "/statements", label: "الكشوفات", icon: "📑" },
      { href: "/statements?tab=inventory", label: "حركة المخزون", icon: "🔁" },
      { href: "/statements?tab=register", label: "كشوف الصناديق", icon: "💰" },
    ],
  },
  {
    key: "settings",
    label: "إعدادات الشركة",
    icon: "⚙️",
    items: [
      { href: "/settings", label: "بيانات الشركة", icon: "🏢" },
      { href: "/branches", label: "الفروع", icon: "🏪" },
      { href: "/users", label: "المستخدمون والأدوار", icon: "🔐" },
      { href: "/invoice-template", label: "قوالب الفواتير", icon: "🖨️" },
      { href: "/barcode-labels", label: "ملصقات الباركود", icon: "🏷️" },
      { href: "/settings#footer", label: "تذييل العقود", icon: "🖋️" },
      { href: "/about", label: "حول النظام", icon: "ℹ️" },
      { href: "/audit", label: "سجل التدقيق", icon: "📝" },
    ],
  },
];

export function Sidebar({
  collapsed, setCollapsed, mobileOpen, onCloseMobile, user, companies, onLogout,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  user: User | null;
  companies: Company[];
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const companyIdMatch = pathname.match(/^\/c\/([^\/]+)/);
  const companyId = companyIdMatch?.[1];
  const base = companyId ? `/c/${companyId}` : "/platform";
  const isPlatform = !companyId;

  // Active module: derive from current path
  const activeModuleKey = useMemo(() => {
    if (isPlatform) return "platform";
    const tail = pathname.replace(base, "");
    for (const m of companyModules) {
      if (m.items.some(i => (i.href === "" && tail === "") || (i.href !== "" && tail.startsWith(i.href)))) {
        return m.key;
      }
    }
    if (tail.startsWith("/pos")) return "pos";
    if (tail.startsWith("/contracts")) return "contracts";
    if (tail.startsWith("/products") || tail.startsWith("/inventory") || tail.startsWith("/branches") || tail.startsWith("/reports-stock") || tail.startsWith("/barcode-labels")) return "inventory";
    if (tail.startsWith("/finance")) return "finance";
    if (tail.startsWith("/invoices") || tail.startsWith("/customers") || tail.startsWith("/suppliers")) return "sales";
    if (tail.startsWith("/statements")) {
      if (tail.includes("tab=register") || tail.includes("tab=bank")) return "finance";
      if (tail.includes("tab=inventory") || tail.includes("tab=stock-balances")) return "inventory";
      if (tail.includes("tab=customer")) return "sales";
      if (tail.includes("tab=supplier")) return "purchases";
      return "finance";
    }
    if (tail.startsWith("/hr")) return "hr";
    if (tail.startsWith("/settings") || tail.startsWith("/users") || tail.startsWith("/audit") || tail.startsWith("/about")) return "settings";
    return "dashboard";
  }, [pathname, base, isPlatform]);

  const [openModules, setOpenModules] = useState<Record<string, boolean>>({ [activeModuleKey]: true });
  const [search, setSearch] = useState("");

  // Auto-open active module on nav
  useEffect(() => {
    setOpenModules(prev => ({ ...prev, [activeModuleKey]: true }));
  }, [activeModuleKey]);

  // Search filter
  const filteredModules = useMemo(() => {
    if (!search.trim()) return companyModules;
    const q = search.toLowerCase();
    return companyModules.map(m => ({
      ...m,
      items: m.items.filter(it => it.label.toLowerCase().includes(q) || it.href.toLowerCase().includes(q)),
    })).filter(m => m.items.length > 0);
  }, [search]);

  const toggleModule = (k: string) => setOpenModules(prev => ({ ...prev, [k]: !prev[k] }));

  const widthClass = collapsed ? "w-[72px]" : "w-[280px]";

  return (
    <aside
      className={`bg-white border-l border-slate-200 flex flex-col fixed inset-y-0 right-0 z-40 ${widthClass} transition-all duration-200 shadow-xl lg:shadow-none ${
        mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      }`}
    >
      {/* Header */}
      <div className={`p-3 border-b border-slate-100 flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
        {collapsed ? (
          <Link href="/" className="w-9 h-9 rounded-lg overflow-hidden shadow flex-shrink-0">
            <Brand small showText={false} />
          </Link>
        ) : (
          <div className="flex-1 min-w-0">
            <Brand small />
            {isPlatform ? (
              <div className="mt-2 text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full inline-block font-bold">لوحة مالك المنصة</div>
            ) : (
              <div className="mt-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full inline-block font-bold border border-emerald-200">مساحة الشركة</div>
            )}
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg items-center justify-center text-slate-600 flex-shrink-0" title={collapsed ? "توسيع" : "طي"}>
          {collapsed ? "»" : "«"}
        </button>
      </div>

      {/* Search (only when expanded) */}
      {!collapsed && (
        <div className="px-3 pt-2">
          <div className="relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث في القوائم..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:bg-white focus:border-[#0f2a54] outline-none"
            />
            {search && <button onClick={() => setSearch("")} className="absolute left-2 top-1.5 text-slate-400 text-xs">✕</button>}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 mt-1" onClick={() => mobileOpen && onCloseMobile()}>
        {isPlatform ? (
          <PlatformSidebar collapsed={collapsed} companies={companies} pathname={pathname} />
        ) : (
          filteredModules.map(m => {
            const isActive = m.key === activeModuleKey;
            const isOpen = !!openModules[m.key];
            return (
              <div key={m.key} className="mb-1">
                <button
                  onClick={() => !collapsed && toggleModule(m.key)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm font-bold transition ${
                    isActive ? "bg-[#0f2a54] text-white shadow" : "text-slate-700 hover:bg-slate-100"
                  } ${collapsed ? "justify-center" : ""}`}
                  title={m.label}
                >
                  <span className="text-base">{m.icon}</span>
                  {!collapsed && <span className="flex-1 text-right truncate">{m.label}</span>}
                  {!collapsed && <span className={`text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>}
                </button>
                {!collapsed && isOpen && (
                  <div className="mt-1 mr-3 border-r-2 border-slate-200 pr-1 space-y-0.5">
                    {m.items.map(it => {
                      const href = `${base}${it.href}`;
                      const tail = pathname.replace(base, "");
                      const isItemActive = (it.href === "" && tail === "") || (it.href !== "" && (tail === it.href || tail.startsWith(it.href + "/") || (it.href.includes("?") && tail.startsWith(it.href.split("?")[0]))));
                      return (
                        <Link
                          key={it.href}
                          href={href}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition ${
                            isItemActive ? "bg-blue-100 text-[#0f2a54] font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <span>{it.icon}</span>
                          <span className="flex-1 truncate">{it.label}</span>
                          {it.coming && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">قريباً</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
        {!isPlatform && filteredModules.length === 0 && (
          <div className="text-center text-xs text-slate-400 py-6">لا نتائج للبحث</div>
        )}
      </nav>

      {/* Footer */}
      <div className={`p-3 border-t bg-slate-50 ${collapsed ? "text-center" : ""}`}>
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0f2a54] to-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{user?.name?.[0] || "م"}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate">{user?.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{user?.email}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button onClick={onLogout} className="text-[10px] bg-white border px-2 py-1.5 rounded-lg hover:bg-slate-50 font-medium">خروج</button>
              <Link href={isPlatform ? "/" : "/platform"} className="text-[10px] bg-[#0f2a54] text-white px-2 py-1.5 rounded-lg text-center font-bold">{isPlatform ? "شركاتي" : "المنصة"}</Link>
            </div>
            <div className="text-[8px] text-center text-slate-400 mt-2 leading-3">إعداد وتنفيذ<br/>المهندس محمد ماجد العليمي</div>
          </>
        ) : (
          <button onClick={onLogout} className="w-9 h-9 rounded-lg bg-slate-200 hover:bg-red-100 text-slate-700 hover:text-red-600" title="خروج">⎋</button>
        )}
      </div>
    </aside>
  );
}

function PlatformSidebar({ collapsed, companies, pathname }: { collapsed: boolean; companies: Company[]; pathname: string }) {
  const platformLinks = [
    { href: "/platform", label: "نظرة عامة", icon: "🏛️", match: (p: string) => p === "/platform" },
    { href: "/platform/companies", label: "إدارة الشركات", icon: "🏢", match: (p: string) => p.includes("/companies") },
    { href: "/platform/users", label: "مستخدمو المنصة", icon: "👥", match: (p: string) => p.includes("/platform/users") },
    { href: "/platform/audit", label: "سجل التدقيق العام", icon: "📝", match: (p: string) => p.includes("/platform/audit") },
    { href: "/platform/settings", label: "إعدادات المنصة", icon: "⚙️", match: (p: string) => p.includes("/platform/settings") },
  ];
  return (
    <div>
      {platformLinks.map(l => (
        <Link key={l.href} href={l.href} className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm font-medium mb-1 ${l.match(pathname) ? "bg-[#0f2a54] text-white shadow" : "text-slate-700 hover:bg-slate-100"} ${collapsed ? "justify-center" : ""}`} title={l.label}>
          <span>{l.icon}</span>
          {!collapsed && <span className="truncate">{l.label}</span>}
        </Link>
      ))}
      {!collapsed && companies.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <div className="text-[10px] font-bold text-slate-400 px-2 mb-1">شركاتي</div>
          {companies.slice(0, 8).map(c => (
            <Link key={c.id} href={`/c/${c.id}`} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-xs">
              <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] flex-shrink-0">🏢</span>
              <span className="truncate">{c.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
