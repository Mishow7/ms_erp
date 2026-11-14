/**
 * ترحيل قاعدة بيانات Neon — ينشئ الجداول الناقصة تلقائياً
 * آمن: لا يحذف بيانات — يستخدم CREATE TABLE IF NOT EXISTS
 *
 * الاستخدام:
 *   set DATABASE_URL=... && npx tsx scripts/neon-migration.ts
 * أو من Vercel: npx vercel --prod && node scripts/neon-migration.js
 */
import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL غير موجود.");
  console.error("   على Windows PowerShell:");
  console.error("   $env:DATABASE_URL='postgresql://...'");
  console.error("   على Mac/Linux:");
  console.error("   export DATABASE_URL='postgresql://...'");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  console.log("⏳ جاري فحص وتهيئة قاعدة البيانات على Neon...\n");

  // 1) جداول النظام الأساسية (إن لم تكن موجودة)
  const baseSql = readFileSync(join(process.cwd(), "scripts", "init-db.sql"), "utf-8");
  console.log("① تطبيق جداول النظام الأساسية...");
  await pool.query(baseSql);
  console.log("   ✅ تم");

  // 2) الترحيل الجديد (صناديق + سندات)
  const migSql = readFileSync(join(process.cwd(), "scripts", "neon-migration.sql"), "utf-8");
  console.log("② تطبيق جداول الصناديق والسندات...");
  await pool.query(migSql);
  console.log("   ✅ تم");

  // 3) بيانات تجريبية إن كانت القاعدة فارغة
  const usersRes = await pool.query("SELECT COUNT(*)::int as c FROM users");
  if (usersRes.rows[0].c === 0) {
    console.log("③ تعبئة البيانات التجريبية (القاعدة فارغة)...");
    const seedSql = readFileSync(join(process.cwd(), "scripts", "seed-db.sql"), "utf-8");
    await pool.query(seedSql);
    console.log("   ✅ تم");
  } else {
    console.log("③ تخطي البيانات التجريبية — القاعدة تحتوي بيانات بالفعل ✅");
  }

  // 4) تقرير نهائي
  const report = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users)::int AS مستخدمون,
      (SELECT COUNT(*) FROM companies)::int AS شركات,
      (SELECT COUNT(*) FROM customers)::int AS عملاء,
      (SELECT COUNT(*) FROM products)::int AS منتجات,
      (SELECT COUNT(*) FROM invoices)::int AS فواتير,
      (SELECT COUNT(*) FROM contracts)::int AS عقود,
      (SELECT COUNT(*) FROM cash_accounts)::int AS صناديق,
      (SELECT COUNT(*) FROM vouchers)::int AS سندات,
      (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public') AS جداول
  `);
  console.log("\n✅ انتهى الترحيل بنجاح!");
  console.table(report.rows[0]);
  await pool.end();
}

main().catch(async (e) => {
  console.error("\n❌ فشل الترحيل:", e.message);
  await pool.end();
  process.exit(1);
});
