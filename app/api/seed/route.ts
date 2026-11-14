import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, companies, branches, companyMembers, roles, modules, companyModules, customers, products, invoices, invoiceItems, contracts, contractPayments, posRegisters, warehouses } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { DEFAULT_ROLES, MODULES } from "@/lib/rbac";

export async function POST() {
  try {
    for (const m of MODULES) {
      const existing = await db.select().from(modules).where(eq(modules.key, m.key)).limit(1);
      if (existing.length === 0) await db.insert(modules).values({ key: m.key, nameAr: m.nameAr, nameEn: m.nameEn, icon: m.icon });
    }

    const superEmail = "admin@ms-saas.com";
    let [superAdmin] = await db.select().from(users).where(eq(users.email, superEmail)).limit(1);
    if (!superAdmin) {
      const hash = await hashPassword("Admin@123");
      [superAdmin] = await db.insert(users).values({ name: "مالك المنصة", email: superEmail, passwordHash: hash, platformRole: "super_admin" }).returning();
    }

    const companiesData = [
      { name: "شركة التقنية المتقدمة", nameEn: "Advanced Tech Co.", taxNumber: "300123456700003", address: "الرياض - العليا - برج التقنية", phone: "0112345678", email: "info@advtech.sa", currency: "SAR", contractFooter: "شركة التقنية المتقدمة — الضمان سنة كاملة على جميع الأجهزة\nحساب بنكي: SA00 0000 0000 0000 — للاستفسار: 0112345678" },
      { name: "مجموعة النور التجارية", nameEn: "Al-Noor Trading Group", taxNumber: "310987654300002", address: "جدة - الكورنيش - مركز الأعمال", phone: "0123456789", email: "contact@alnoor.sa", currency: "SAR", contractFooter: "مجموعة النور — التسليم خلال 30 يوم من الاعتماد\nشروط الدفع: 50% مقدم — 50% عند التسليم — حساب الأهلي: SA11 1111 1111" },
    ];

    const createdCompanies = [];
    for (const cdata of companiesData) {
      let [existing] = await db.select().from(companies).where(eq(companies.name, cdata.name)).limit(1);
      if (!existing) {
        [existing] = await db.insert(companies).values({ name: cdata.name, nameEn: cdata.nameEn, taxNumber: cdata.taxNumber, address: cdata.address, phone: cdata.phone, email: cdata.email, currency: cdata.currency, contractFooter: (cdata as any).contractFooter, plan: "pro", maxUsers: 50, maxBranches: 10, createdBy: superAdmin.id }).returning();
        await db.insert(branches).values({ companyId: existing.id, name: "الفرع الرئيسي", isMain: true, address: cdata.address });
        await db.insert(branches).values({ companyId: existing.id, name: "فرع جدة", isMain: false, address: "جدة - الفرع الثاني" });
      } else {
        // update footer if empty
        if (!existing.contractFooter) await db.update(companies).set({ contractFooter: (cdata as any).contractFooter }).where(eq(companies.id, existing.id));
      }
      createdCompanies.push(existing);

      // add warehouse + pos register if missing
      let warehouse = (await db.select().from(warehouses).where(eq(warehouses.companyId, existing.id)))[0];
      if (!warehouse) {
        const [w] = await db.insert(warehouses).values({ companyId: existing.id, name: "المستودع الرئيسي", location: cdata.address }).returning();
        warehouse = w;
      }
      const registersCount = (await db.select().from(posRegisters).where(eq(posRegisters.companyId, existing.id))).length;
      if (registersCount === 0) {
        const [branch] = await db.select().from(branches).where(eq(branches.companyId, existing.id)).limit(1);
        await db.insert(posRegisters).values({
          companyId: existing.id, branchId: branch.id, warehouseId: warehouse.id, name: "الصندوق 1 - الكاشير",
        });
        await db.insert(posRegisters).values({
          companyId: existing.id, branchId: branch.id, warehouseId: warehouse.id, name: "الصندوق 2 - الكاشير الخلفي",
        });
      }

      for (const r of DEFAULT_ROLES) {
        const found = await db.select().from(roles).where(eq(roles.companyId, existing.id));
        const hasRole = found.find(x => x.name === r.name);
        if (!hasRole) await db.insert(roles).values({ companyId: existing.id, name: r.name, nameAr: r.nameAr, permissions: r.permissions as any, isSystem: true });
      }

      for (const m of MODULES) {
        const modExists = await db.select().from(companyModules).where(eq(companyModules.companyId, existing.id));
        if (!modExists.find(x => x.moduleKey === m.key)) await db.insert(companyModules).values({ companyId: existing.id, moduleKey: m.key, isEnabled: true });
      }
    }

    const usersData = [
      { name: "أحمد مدير التقنية", email: "ahmed@advtech.sa", companyIdx: 0, role: "company_admin", password: "Ahmed@123" },
      { name: "سارة المحاسبة", email: "sara@advtech.sa", companyIdx: 0, role: "accountant", password: "Sara@123" },
      { name: "خالد المبيعات", email: "khaled@alnoor.sa", companyIdx: 1, role: "company_admin", password: "Khaled@123" },
      { name: "نورة الموارد", email: "nora@alnoor.sa", companyIdx: 1, role: "hr_manager", password: "Nora@123" },
    ];
    for (const u of usersData) {
      let [existing] = await db.select().from(users).where(eq(users.email, u.email)).limit(1);
      if (!existing) {
        const hash = await hashPassword(u.password);
        [existing] = await db.insert(users).values({ name: u.name, email: u.email, passwordHash: hash, platformRole: u.role === "company_admin" ? "company_admin" : "employee" }).returning();
      }
      const comp = createdCompanies[u.companyIdx];
      const linked = await db.select().from(companyMembers).where(eq(companyMembers.companyId, comp.id));
      if (!linked.find(x => x.userId === existing.id)) await db.insert(companyMembers).values({ companyId: comp.id, userId: existing.id, role: u.role });
    }

    for (let idx = 0; idx < createdCompanies.length; idx++) {
      const comp = createdCompanies[idx];
      const custCount = (await db.select().from(customers).where(eq(customers.companyId, comp.id))).length;
      if (custCount === 0) {
        const custs = idx === 0 ? [
          { name: "مؤسسة الرواد للتجارة", phone: "0555123456", email: "rowad@example.com", city: "الرياض" },
          { name: "شركة الأفق للخدمات", phone: "0555987654", email: "ofoq@example.com", city: "الدمام" },
          { name: "متجر الإلكترونيات الحديثة", phone: "0555111222", email: "modern@example.com", city: "جدة" },
        ] : [
          { name: "شركة النخبة للمقاولات", phone: "0566123456", email: "nokhba@example.com", city: "مكة" },
          { name: "مجموعة السلام الطبية", phone: "0566987654", email: "salam@example.com", city: "جدة" },
        ];
        for (const c of custs) await db.insert(customers).values({ companyId: comp.id, name: c.name, phone: c.phone, email: c.email, city: c.city, address: c.city });
      }

      const prodCount = (await db.select().from(products).where(eq(products.companyId, comp.id))).length;
      if (prodCount === 0) {
        const prods = idx === 0 ? [
          { name: "لابتوب HP ProBook 450", sku: "HP-450-01", category: "حاسبات", price: "4200", cost: "3500", stock: 25, unit: "قطعة" },
          { name: "طابعة ليزر Brother MFC", sku: "BR-MFC-02", category: "طابعات", price: "1250", cost: "900", stock: 40, unit: "قطعة" },
          { name: "رخصة Microsoft 365 سنوية", sku: "MS365-YEAR", category: "برمجيات", price: "450", cost: "300", stock: 100, unit: "ترخيص" },
          { name: "خدمة صيانة شهرية", sku: "SERV-MONTH", category: "خدمات", price: "800", cost: "400", stock: 0, unit: "خدمة" },
        ] : [
          { name: "أسمنت مقاوم 50 كغ", sku: "CEM-50-01", category: "مواد بناء", price: "28", cost: "22", stock: 1500, unit: "كيس" },
          { name: "حديد تسليح 12 مم", sku: "STEEL-12", category: "حديد", price: "2800", cost: "2400", stock: 80, unit: "طن" },
          { name: "بلاط سيراميك فاخر", sku: "TILE-LUX", category: "تشطيب", price: "85", cost: "60", stock: 500, unit: "م²" },
        ];
        for (const p of prods) await db.insert(products).values({ companyId: comp.id, name: p.name, sku: p.sku, category: p.category, price: p.price, cost: p.cost, stock: p.stock, unit: p.unit });
      }

      const invExists = await db.select().from(invoices).where(eq(invoices.companyId, comp.id));
      if (invExists.length === 0) {
        const [cust] = await db.select().from(customers).where(eq(customers.companyId, comp.id)).limit(1);
        const plist = await db.select().from(products).where(eq(products.companyId, comp.id)).limit(2);
        if (cust && plist.length > 0) {
          const subtotal = plist.reduce((a, p) => a + parseFloat(p.price) * 2, 0);
          const tax = subtotal * 0.15;
          const total = subtotal + tax;
          const [inv] = await db.insert(invoices).values({
            companyId: comp.id,
            customerId: cust.id,
            invoiceNumber: `INV-2025-${idx === 0 ? "1001" : "2001"}`,
            type: "sale",
            status: "sent",
            subtotal: String(subtotal),
            taxRate: "15",
            taxAmount: String(tax),
            total: String(total),
            createdBy: superAdmin.id,
          }).returning();
          for (const p of plist) await db.insert(invoiceItems).values({ invoiceId: inv.id, productId: p.id, productName: p.name, quantity: "2", unitPrice: p.price, total: String(parseFloat(p.price) * 2) });
        }
      }

      // create sample contracts
      const contractCount = (await db.select().from(contracts).where(eq(contracts.companyId, comp.id))).length;
      if (contractCount === 0) {
        const [cust] = await db.select().from(customers).where(eq(customers.companyId, comp.id)).limit(1);
        const [inv] = await db.select().from(invoices).where(eq(invoices.companyId, comp.id)).limit(1);
        const [branch] = await db.select().from(branches).where(eq(branches.companyId, comp.id)).limit(1);
        if (cust) {
          const sampleContracts = idx === 0 ? [
            {
              customerId: cust.id,
              invoiceId: inv?.id || null,
              contractNumber: `CTR-2025-100${idx + 1}`,
              title: "عقد توريد وصيانة أجهزة",
              status: "approved" as const,
              scopeOfWork: "توريد 15 جهاز لابتوب HP ProBook 450 مع التركيب والإعداد\nتركيب طابعتين Brother MFC في المقر الرئيسي وفرع الدمام\nتقديم خدمة صيانة دورية شهرية لمدة 12 شهر تشمل الدعم الفني عن بعد والحضوري\nتدريب 10 موظفين على استخدام الأنظمة",
              terms: "1- مدة الضمان سنة كاملة من تاريخ التسليم\n2- التسليم خلال 14 يوم من توقيع العقد\n3- الدفع على دفعتين: 50% مقدم، 50% عند التسليم\n4- في حال التأخير يتحمل المورد غرامة 1% يومياً",
              notes: "تم الاتفاق على زيارة ميدانية قبل التسليم النهائي",
              totalAmount: "85000",
              deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
            {
              customerId: cust.id,
              contractNumber: `CTR-2025-100${idx + 2}`,
              title: "عقد ترخيص برمجيات سنوي",
              status: "in_progress" as const,
              scopeOfWork: "توفير 30 ترخيص Microsoft 365 Business Standard\nالتثبيت والتفعيل على جميع الأجهزة\nدعم فني لمدة سنة + تحديثات",
              terms: "التفعيل خلال 3 أيام عمل — الدعم عبر الهاتف والبريد",
              totalAmount: "13500",
              deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            },
          ] : [
            {
              customerId: cust.id,
              invoiceId: inv?.id || null,
              contractNumber: `CTR-2025-200${idx + 1}`,
              title: "عقد توريد مواد بناء - مشروع النخبة السكني",
              status: "pending_approval" as const,
              scopeOfWork: "توريد 500 كيس أسمنت مقاوم 50كغ\nتوريد 20 طن حديد تسليح 12مم\nتوريد 300م² بلاط سيراميك فاخر شامل النقل لموقع المشروع بمكة\nالالتزام بجدول التسليم المتفق عليه حسب مراحل المشروع",
              terms: "1- التسليم على دفعات حسب طلب الموقع\n2- فحص الجودة عند الاستلام\n3- الدفع: 30% مقدم، 70% بعد كل توريد",
              totalAmount: "120000",
              deliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          ];
          for (const sc of sampleContracts) {
            const [ctr] = await db.insert(contracts).values({
              companyId: comp.id,
              branchId: branch?.id,
              customerId: sc.customerId,
              invoiceId: sc.invoiceId as any,
              contractNumber: sc.contractNumber,
              title: sc.title,
              status: sc.status as any,
              scopeOfWork: sc.scopeOfWork,
              terms: (sc as any).terms,
              notes: (sc as any).notes || null,
              totalAmount: sc.totalAmount,
              deliveryDate: sc.deliveryDate,
              createdBy: superAdmin.id,
            }).returning();
            // add sample payments for first contract of first company
            if (idx === 0 && sc.contractNumber === "CTR-2025-1001") {
              await db.insert(contractPayments).values({
                companyId: comp.id,
                contractId: ctr.id,
                amount: "42500",
                paymentDate: new Date(),
                method: "transfer",
                reference: "TR-2025-001",
                notes: "دفعة مقدمة 50%",
              });
              await db.insert(contractPayments).values({
                companyId: comp.id,
                contractId: ctr.id,
                amount: "20000",
                paymentDate: new Date(),
                method: "cash",
                reference: "CASH-002",
                notes: "دفعة ثانية",
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true, message: "تم إنشاء البيانات التجريبية بنجاح", superAdmin: { email: superEmail, password: "Admin@123" } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
