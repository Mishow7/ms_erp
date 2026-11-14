export function formatCurrency(amount: number | string, currency = "SAR") {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);
}
export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(date));
}
