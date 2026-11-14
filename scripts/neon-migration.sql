-- ============================================================
-- MS للأعمال البرمجية — ترحيل إضافات 2026 (صناديق + سندات)
-- استخدمه في Neon SQL Editor → Run
-- آمن: لا يحذف ولا يعدّل بيانات موجودة
-- ============================================================

-- الصناديق النقدية
CREATE TABLE IF NOT EXISTS cash_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id),
  name varchar(200) NOT NULL,
  currency varchar(10) DEFAULT 'SAR' NOT NULL,
  opening_balance numeric(14,2) DEFAULT 0 NOT NULL,
  current_balance numeric(14,2) DEFAULT 0 NOT NULL,
  notes text,
  is_active boolean DEFAULT true NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- السندات (قبض / صرف / قيد محاسبي)
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id),
  voucher_number varchar(50) NOT NULL,
  type varchar(30) NOT NULL,
  voucher_date timestamp DEFAULT now() NOT NULL,
  cash_account_id uuid REFERENCES cash_accounts(id),
  bank_account_id uuid REFERENCES bank_accounts(id),
  customer_id uuid REFERENCES customers(id),
  supplier_id uuid REFERENCES suppliers(id),
  amount numeric(14,2) NOT NULL,
  debit_account_id uuid REFERENCES ledger_accounts(id),
  credit_account_id uuid REFERENCES ledger_accounts(id),
  description text,
  reference varchar(200),
  status varchar(30) DEFAULT 'posted' NOT NULL,
  created_by uuid REFERENCES users(id),
  posted_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- فهارس الأداء
CREATE INDEX IF NOT EXISTS idx_vouchers_company ON vouchers(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_accounts_company ON cash_accounts(company_id);

-- تأكيد
SELECT '✅ تم إنشاء جداول الصناديق والسندات بنجاح' AS النتيجة,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('cash_accounts','vouchers')) AS عدد_الجداول_الجديدة;
