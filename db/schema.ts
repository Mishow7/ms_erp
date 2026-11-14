import { pgTable, uuid, varchar, text, timestamp, boolean, integer, numeric, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const platformRoleEnum = pgEnum("platform_role", ["super_admin", "company_admin", "manager", "employee"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "overdue", "cancelled"]);
export const invoiceTypeEnum = pgEnum("invoice_type", ["sale", "purchase"]);
export const taskStatusEnum = pgEnum("task_status", ["pending", "in_progress", "completed", "cancelled"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);
export const contractStatusEnum = pgEnum("contract_status", ["draft", "pending_approval", "approved", "in_progress", "completed", "cancelled"]);
export const posShiftStatusEnum = pgEnum("pos_shift_status", ["open", "closed"]);
export const posPaymentMethodEnum = pgEnum("pos_payment_method", ["cash", "card", "transfer", "credit"]);
export const quoteStatusEnum = pgEnum("quote_status", ["draft", "pending_approval", "approved", "rejected", "converted"]);
export const salesOrderStatusEnum = pgEnum("sales_order_status", ["draft", "pending_approval", "approved", "in_progress", "delivered", "invoiced", "cancelled"]);
export const creditNoteStatusEnum = pgEnum("credit_note_status", ["draft", "pending_approval", "approved", "applied", "cancelled"]);
export const inventoryCountStatusEnum = pgEnum("inventory_count_status", ["draft", "pending_approval", "approved", "cancelled"]);
export const inventoryAdjustmentStatusEnum = pgEnum("inventory_adjustment_status", ["draft", "pending_approval", "approved", "cancelled"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 500 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  platformRole: platformRoleEnum("platform_role").default("employee").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  nameEn: varchar("name_en", { length: 200 }),
  logoUrl: text("logo_url"),
  taxNumber: varchar("tax_number", { length: 100 }),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 200 }),
  currency: varchar("currency", { length: 10 }).default("SAR").notNull(),
  timezone: varchar("timezone", { length: 100 }).default("Asia/Riyadh"),
  fiscalYearStart: varchar("fiscal_year_start", { length: 20 }).default("01-01"),
  plan: varchar("plan", { length: 50 }).default("basic"),
  maxUsers: integer("max_users").default(10),
  maxBranches: integer("max_branches").default(5),
  storageLimitMb: integer("storage_limit_mb").default(5120),
  contractFooter: text("contract_footer"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by"),
});

export const branches = pgTable("branches", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  isMain: boolean("is_main").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const warehouses = pgTable("warehouses", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id),
  name: varchar("name", { length: 200 }).notNull(),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const companyMembers = pgTable("company_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  description: text("description"),
  permissions: jsonb("permissions").$type<Record<string, string[]>>().notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  roleId: uuid("role_id").references(() => roles.id, { onDelete: "cascade" }).notNull(),
});

export const modules = pgTable("modules", {
  key: varchar("key", { length: 50 }).primaryKey(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 50 }),
});

export const companyModules = pgTable("company_modules", {
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  moduleKey: varchar("module_key", { length: 50 }).references(() => modules.key).notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
});

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  taxNumber: varchar("tax_number", { length: 100 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  balance: numeric("balance", { precision: 14, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by"),
});

export const suppliers = pgTable("suppliers", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  taxNumber: varchar("tax_number", { length: 100 }),
  address: text("address"),
  balance: numeric("balance", { precision: 14, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 300 }).notNull(),
  sku: varchar("sku", { length: 100 }),
  barcode: varchar("barcode", { length: 100 }),
  category: varchar("category", { length: 100 }),
  unit: varchar("unit", { length: 50 }).default("قطعة"),
  price: numeric("price", { precision: 14, scale: 2 }).notNull(),
  cost: numeric("cost", { precision: 14, scale: 2 }).default("0"),
  stock: integer("stock").default(0).notNull(),
  minStock: integer("min_stock").default(5),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("15"),
  isService: boolean("is_service").default(false),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id),
  customerId: uuid("customer_id").references(() => customers.id),
  supplierId: uuid("supplier_id").references(() => suppliers.id),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  type: invoiceTypeEnum("type").notNull(),
  status: invoiceStatusEnum("status").default("draft").notNull(),
  issueDate: timestamp("issue_date").defaultNow().notNull(),
  dueDate: timestamp("due_date"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("15"),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).default("0"),
  discount: numeric("discount", { precision: 14, scale: 2 }).default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 10 }).default("SAR"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id),
  productName: varchar("product_name", { length: 300 }).notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
});

// ===== العقود التفصيلية =====
export const contracts = pgTable("contracts", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  contractNumber: varchar("contract_number", { length: 50 }).notNull(),
  title: varchar("title", { length: 300 }),
  status: contractStatusEnum("status").default("draft").notNull(),
  // وصف المنتجات/الخدمات ونطاق العمل
  scopeOfWork: text("scope_of_work").notNull(),
  // الشروط والملاحظات
  terms: text("terms"),
  notes: text("notes"),
  // مبالغ
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
  // سيتم حساب paidAmount من مجموع الدفعات، لكن نخزن كاش للعرض
  // لكن الحساب الحقيقي من جدول الدفعات
  deliveryDate: timestamp("delivery_date"),
  createdBy: uuid("created_by").references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contractPayments = pgTable("contract_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  contractId: uuid("contract_id").references(() => contracts.id, { onDelete: "cascade" }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  method: varchar("method", { length: 50 }).default("cash"),
  reference: varchar("reference", { length: 200 }),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ledgerAccounts = pgTable("ledger_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  parentId: uuid("parent_id"),
  balance: numeric("balance", { precision: 14, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  entryNumber: varchar("entry_number", { length: 50 }).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  description: text("description").notNull(),
  totalDebit: numeric("total_debit", { precision: 14, scale: 2 }).notNull(),
  totalCredit: numeric("total_credit", { precision: 14, scale: 2 }).notNull(),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const journalLines = pgTable("journal_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  entryId: uuid("entry_id").references(() => journalEntries.id, { onDelete: "cascade" }).notNull(),
  accountId: uuid("account_id").references(() => ledgerAccounts.id).notNull(),
  debit: numeric("debit", { precision: 14, scale: 2 }).default("0"),
  credit: numeric("credit", { precision: 14, scale: 2 }).default("0"),
  description: text("description"),
});

export const employees = pgTable("employees", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id),
  employeeNumber: varchar("employee_number", { length: 50 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  department: varchar("department", { length: 100 }),
  jobTitle: varchar("job_title", { length: 100 }),
  salary: numeric("salary", { precision: 14, scale: 2 }).notNull(),
  hireDate: timestamp("hire_date").defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  assigneeId: uuid("assignee_id").references(() => users.id),
  createdBy: uuid("created_by").references(() => users.id),
  status: taskStatusEnum("status").default("pending").notNull(),
  priority: taskPriorityEnum("priority").default("medium").notNull(),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventoryMovements = pgTable("inventory_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  quantity: integer("quantity").notNull(),
  reference: varchar("reference", { length: 200 }),
  sourceDocument: varchar("source_document", { length: 50 }),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== نقاط البيع =====
export const posRegisters = pgTable("pos_registers", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id).notNull(),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const posShifts = pgTable("pos_shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  registerId: uuid("register_id").references(() => posRegisters.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  status: posShiftStatusEnum("status").default("open").notNull(),
  openingCash: numeric("opening_cash", { precision: 14, scale: 2 }).default("0").notNull(),
  closingCash: numeric("closing_cash", { precision: 14, scale: 2 }),
  expectedCash: numeric("expected_cash", { precision: 14, scale: 2 }),
  difference: numeric("difference", { precision: 14, scale: 2 }),
  notes: text("notes"),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

export const posSales = pgTable("pos_sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  shiftId: uuid("shift_id").references(() => posShifts.id).notNull(),
  registerId: uuid("register_id").references(() => posRegisters.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  customerId: uuid("customer_id").references(() => customers.id),
  receiptNumber: varchar("receipt_number", { length: 50 }).notNull(),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 14, scale: 2 }).default("0").notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("15").notNull(),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).default("0").notNull(),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  paid: numeric("paid", { precision: 14, scale: 2 }).default("0").notNull(),
  change: numeric("change", { precision: 14, scale: 2 }).default("0").notNull(),
  status: varchar("status", { length: 30 }).default("completed").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const posSaleItems = pgTable("pos_sale_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  saleId: uuid("sale_id").references(() => posSales.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  productName: varchar("product_name", { length: 300 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 14, scale: 2 }).default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  returnedQty: integer("returned_qty").default(0).notNull(),
});

export const posSalePayments = pgTable("pos_sale_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  saleId: uuid("sale_id").references(() => posSales.id, { onDelete: "cascade" }).notNull(),
  method: posPaymentMethodEnum("method").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  reference: varchar("reference", { length: 200 }),
});

export const posReturns = pgTable("pos_returns", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  saleId: uuid("sale_id").references(() => posSales.id).notNull(),
  registerId: uuid("register_id").references(() => posRegisters.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  returnNumber: varchar("return_number", { length: 50 }).notNull(),
  reason: text("reason"),
  refundMethod: posPaymentMethodEnum("refund_method").notNull(),
  refundAmount: numeric("refund_amount", { precision: 14, scale: 2 }).notNull(),
  restockTo: varchar("restock_to", { length: 30 }).default("good").notNull(), // good | damaged
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const posReturnItems = pgTable("pos_return_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  returnId: uuid("return_id").references(() => posReturns.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  productName: varchar("product_name", { length: 300 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
});

// ===== عروض الأسعار وأوامر البيع والإشعارات الدائنة =====
export const salesQuotes = pgTable("sales_quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  customerId: uuid("customer_id").references(() => customers.id).notNull(),
  quoteNumber: varchar("quote_number", { length: 50 }).notNull(),
  status: quoteStatusEnum("status").default("draft").notNull(),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  notes: text("notes"),
  validUntil: timestamp("valid_until"),
  createdBy: uuid("created_by").references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesOrders = pgTable("sales_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  customerId: uuid("customer_id").references(() => customers.id),
  quoteId: uuid("quote_id").references(() => salesQuotes.id),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  status: salesOrderStatusEnum("status").default("draft").notNull(),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creditNotes = pgTable("credit_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  invoiceId: uuid("invoice_id").references(() => invoices.id).notNull(),
  customerId: uuid("customer_id").references(() => customers.id).notNull(),
  noteNumber: varchar("note_number", { length: 50 }).notNull(),
  status: creditNoteStatusEnum("status").default("draft").notNull(),
  reason: text("reason"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== حركات نقدية على الصندوق (إيداعات/سحوبات/مصروفات) =====
export const posCashMovementType = pgEnum("pos_cash_movement_type", ["deposit", "withdrawal", "expense", "tip_in", "tip_out", "adjustment"]);
export const posCashMovements = pgTable("pos_cash_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  shiftId: uuid("shift_id").references(() => posShifts.id, { onDelete: "cascade" }).notNull(),
  type: posCashMovementType("type").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  reason: text("reason"),
  reference: varchar("reference", { length: 200 }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== إعادة فتح وردية مغلقة (تصحيح موثق) =====
export const posShiftReopens = pgTable("pos_shift_reopens", {
  id: uuid("id").defaultRandom().primaryKey(),
  shiftId: uuid("shift_id").references(() => posShifts.id, { onDelete: "cascade" }).notNull(),
  reopenedBy: uuid("reopened_by").references(() => users.id).notNull(),
  reason: text("reason").notNull(),
  previousClosingCash: numeric("previous_closing_cash", { precision: 14, scale: 2 }).notNull(),
  newClosingCash: numeric("new_closing_cash", { precision: 14, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== الحسابات البنكية =====
export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  bankName: varchar("bank_name", { length: 200 }),
  accountNumber: varchar("account_number", { length: 100 }),
  iban: varchar("iban", { length: 100 }),
  openingBalance: numeric("opening_balance", { precision: 14, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 10 }).default("SAR"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bankTransactions = pgTable("bank_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 30 }).notNull(), // deposit | withdrawal | transfer | reconciliation
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  reference: varchar("reference", { length: 200 }),
  description: text("description"),
  date: timestamp("date").defaultNow().notNull(),
  sourceDocument: varchar("source_document", { length: 50 }),
  sourceId: uuid("source_id"),
  reconciled: boolean("reconciled").default(false),
  reconciledAt: timestamp("reconciled_at"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const supplierPayments = pgTable("supplier_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  supplierId: uuid("supplier_id").references(() => suppliers.id).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  method: varchar("method", { length: 50 }).default("cash"),
  reference: varchar("reference", { length: 200 }),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customerPayments = pgTable("customer_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  customerId: uuid("customer_id").references(() => customers.id).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  method: varchar("method", { length: 50 }).default("cash"),
  reference: varchar("reference", { length: 200 }),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== الصناديق (حسابات نقدية) =====
export const cashAccounts = pgTable("cash_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id),
  name: varchar("name", { length: 200 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("SAR").notNull(),
  openingBalance: numeric("opening_balance", { precision: 14, scale: 2 }).default("0").notNull(),
  currentBalance: numeric("current_balance", { precision: 14, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ===== السندات والقيود المحاسبية =====
export const voucherTypeEnum = pgEnum("voucher_type", ["receipt", "payment", "journal"]);
export const vouchers = pgTable("vouchers", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id),
  voucherNumber: varchar("voucher_number", { length: 50 }).notNull(),
  type: voucherTypeEnum("type").notNull(),
  voucherDate: timestamp("voucher_date").defaultNow().notNull(),
  cashAccountId: uuid("cash_account_id").references(() => cashAccounts.id),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id),
  customerId: uuid("customer_id").references(() => customers.id),
  supplierId: uuid("supplier_id").references(() => suppliers.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  debitAccountId: uuid("debit_account_id").references(() => ledgerAccounts.id),
  creditAccountId: uuid("credit_account_id").references(() => ledgerAccounts.id),
  description: text("description"),
  reference: varchar("reference", { length: 200 }),
  status: varchar("status", { length: 30 }).default("posted").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ===== إعدادات الشركة (سياسات الوردية) =====
export const companySettings = pgTable("company_settings", {
  companyId: uuid("company_id").primaryKey().references(() => companies.id, { onDelete: "cascade" }),
  // سياسات الوردية
  posRequireShift: boolean("pos_require_shift").default(true),
  posAllowMultipleShiftsPerRegister: boolean("pos_allow_multiple_shifts_per_register").default(false),
  posRequireManagerApprovalOnClose: boolean("pos_require_manager_approval_on_close").default(false),
  posCashDiffApprovalThreshold: numeric("pos_cash_diff_approval_threshold", { precision: 14, scale: 2 }).default("50"),
  // سياسات عامة
  defaultCurrency: varchar("default_currency", { length: 10 }).default("SAR"),
});

// ===== الجرد والتسويات =====
export const inventoryCounts = pgTable("inventory_counts", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id).notNull(),
  countNumber: varchar("count_number", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }),
  status: inventoryCountStatusEnum("status").default("draft").notNull(),
  snapshotAt: timestamp("snapshot_at").defaultNow().notNull(),
  notes: text("notes"),
  countedBy: varchar("counted_by", { length: 200 }),
  createdBy: uuid("created_by").references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryCountItems = pgTable("inventory_count_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  countId: uuid("count_id").references(() => inventoryCounts.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  systemQty: integer("system_qty").notNull(),
  countedQty: integer("counted_qty"),
  difference: integer("difference"),
  notes: text("notes"),
});

export const inventoryAdjustments = pgTable("inventory_adjustments", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  countId: uuid("count_id").references(() => inventoryCounts.id).notNull(),
  adjustmentNumber: varchar("adjustment_number", { length: 50 }).notNull(),
  status: inventoryAdjustmentStatusEnum("status").default("draft").notNull(),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryAdjustmentItems = pgTable("inventory_adjustment_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  adjustmentId: uuid("adjustment_id").references(() => inventoryAdjustments.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  systemQty: integer("system_qty").notNull(),
  countedQty: integer("counted_qty").notNull(),
  difference: integer("difference").notNull(),
  restockTo: varchar("restock_to", { length: 30 }).default("good").notNull(),
  costValue: numeric("cost_value", { precision: 14, scale: 2 }).default("0"),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entity: varchar("entity", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }),
  details: text("details"),
  ip: varchar("ip", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  title: varchar("title", { length: 300 }).notNull(),
  body: text("body"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
