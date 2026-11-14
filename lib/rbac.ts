export type PermissionAction = "read" | "create" | "update" | "delete" | "export" | "approve";

export const MODULES = [
  { key: "finance", nameAr: "المالية والمحاسبة", nameEn: "Finance", icon: "💰" },
  { key: "sales", nameAr: "المبيعات والعملاء", nameEn: "Sales", icon: "🛒" },
  { key: "contracts", nameAr: "العقود التفصيلية", nameEn: "Contracts", icon: "📄" },
  { key: "purchases", nameAr: "المشتريات والموردون", nameEn: "Purchases", icon: "📦" },
  { key: "inventory", nameAr: "المخزون والمستودعات", nameEn: "Inventory", icon: "🏬" },
  { key: "hr", nameAr: "الموارد البشرية", nameEn: "HR", icon: "👥" },
  { key: "tasks", nameAr: "المهام والموافقات", nameEn: "Tasks", icon: "✅" },
  { key: "reports", nameAr: "التقارير", nameEn: "Reports", icon: "📊" },
  { key: "settings", nameAr: "الإعدادات", nameEn: "Settings", icon: "⚙️" },
];

export const DEFAULT_ROLES = [
  {
    name: "company_admin",
    nameAr: "مدير الشركة",
    permissions: {
      finance: ["read", "create", "update", "delete", "export", "approve"],
      sales: ["read", "create", "update", "delete", "export", "approve"],
      contracts: ["read", "create", "update", "delete", "export", "approve"],
      purchases: ["read", "create", "update", "delete", "export", "approve"],
      inventory: ["read", "create", "update", "delete", "export", "approve"],
      hr: ["read", "create", "update", "delete", "export", "approve"],
      tasks: ["read", "create", "update", "delete", "export", "approve"],
      reports: ["read", "export"],
      settings: ["read", "create", "update", "delete"],
    },
  },
  {
    name: "accountant",
    nameAr: "محاسب",
    permissions: {
      finance: ["read", "create", "update", "export"],
      sales: ["read"],
      contracts: ["read", "export"],
      purchases: ["read"],
      inventory: ["read"],
      reports: ["read", "export"],
    },
  },
  {
    name: "sales_manager",
    nameAr: "مسؤول مبيعات",
    permissions: {
      sales: ["read", "create", "update", "export"],
      contracts: ["read", "create", "update", "export"],
      inventory: ["read"],
      reports: ["read"],
    },
  },
  {
    name: "inventory_manager",
    nameAr: "مسؤول مخزون",
    permissions: {
      inventory: ["read", "create", "update", "delete", "export"],
      purchases: ["read", "create"],
      sales: ["read"],
    },
  },
  {
    name: "hr_manager",
    nameAr: "مسؤول موارد بشرية",
    permissions: {
      hr: ["read", "create", "update", "delete", "export"],
      reports: ["read"],
    },
  },
  {
    name: "employee",
    nameAr: "موظف",
    permissions: {
      tasks: ["read", "create", "update"],
      sales: ["read"],
      contracts: ["read"],
    },
  },
];

export function hasPermission(userPermissions: Record<string, string[]>, module: string, action: PermissionAction): boolean {
  const perms = userPermissions[module];
  if (!perms) return false;
  return perms.includes(action);
}
