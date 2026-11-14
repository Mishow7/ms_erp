/**
 * مكتبة الطباعة المركزية — تطبع مستنداً محدداً فقط (وليس الشاشة كاملة)
 * الاستخدام:
 *   printElement("receipt")   // يطبع العنصر بالمعرف print-receipt
 *   printHTML({ title, html, styles })  // يطبع HTML مخصص
 */

export type PrintOptions = {
  title?: string;
  /** CSS إضافي */
  styles?: string;
  /** حجم الورق: A4 | A5 | Letter | receipt */
  paper?: "A4" | "A5" | "Letter" | "receipt";
  orientation?: "portrait" | "landscape";
  /** يحدد العنصر المراد طباعته */
  elementId?: string;
  /** HTML كامل مخصص */
  html?: string;
};

const PAPER_SIZES: Record<string, string> = {
  A4: "A4",
  A5: "A5",
  Letter: "Letter",
  receipt: "80mm",
};

function buildStyles(opts: PrintOptions): string {
  const size = PAPER_SIZES[opts.paper || "A4"];
  const orient = opts.orientation || "portrait";
  return `
    @page { size: ${size} ${orient}; margin: ${opts.paper === "receipt" ? "4mm" : "10mm"}; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { margin:0 !important; padding:0 !important; background:#fff !important; }
    body { font-family: 'Tajawal','IBM Plex Sans Arabic',system-ui,sans-serif; color:#0f172a; }
    table { width:100%; border-collapse:collapse; }
    th, td { border:1px solid #cbd5e1; padding:6px 8px; text-align:right; }
    th { background:#0f2a54 !important; color:#fff !important; }
    .no-print, nav, header.sticky, aside, .sidebar { display:none !important; }
    .print-only { display:block !important; }
    ${opts.styles || ""}
  `;
}

/**
 * يطبع عنصراً من الصفحة الحالية فقط
 */
export function printElement(elementId: string, opts: PrintOptions = {}) {
  const el = document.getElementById(elementId);
  if (!el) {
    console.error(`[print] العنصر "${elementId}" غير موجود`);
    alert("تعذّر العثور على المستند للطباعة");
    return;
  }
  const styles = buildStyles(opts);
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap" rel="stylesheet">
    <title>${opts.title || "طباعة"}</title>
    <style>${styles}</style></head>
    <body>${el.outerHTML}</body></html>`;
  openAndPrint(html, opts);
}

/**
 * يطبع HTML مخصص
 */
export function printHTML(html: string, opts: PrintOptions = {}) {
  const styles = buildStyles(opts);
  const full = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap" rel="stylesheet">
    <title>${opts.title || "طباعة"}</title>
    <style>${styles}</style></head><body>${html}</body></html>`;
  openAndPrint(full, opts);
}

function openAndPrint(html: string, opts: PrintOptions) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) {
    alert("يرجى السماح بالنوافذ المنبثقة لطباعة المستند");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  // انتظار تحميل الخطوط ثم الطباعة
  const doPrint = () => {
    try { w.focus(); w.print(); } catch (e) { console.error(e); }
  };
  if (w.document.fonts && w.document.fonts.ready) {
    w.document.fonts.ready.then(() => setTimeout(doPrint, 120)).catch(() => setTimeout(doPrint, 400));
  } else {
    setTimeout(doPrint, 350);
  }
  // إغلاق النافذة بعد الطباعة (المتصفح قد يمنع الإغلاق التلقائي)
  setTimeout(() => { try { if (!w.closed) w.close(); } catch {} }, 60000);
}

/**
 * طباعة جزء من الصفحة معKeeper العنصر محدد — طريقة بديلة تستخدم popup
 */
export function printSection(selector: string, opts: PrintOptions = {}) {
  const nodes = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  if (nodes.length === 0) {
    alert("لا توجد بيانات للطباعة");
    return;
  }
  const inner = nodes.map(n => n.outerHTML).join('<div style="page-break-after:always"></div>');
  printHTML(inner, opts);
}
