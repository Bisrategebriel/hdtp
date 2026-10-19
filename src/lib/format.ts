/** "ETB 25,047" (whole birr) or "ETB 25,047.50" when there are cents. */
export function formatMoney(amount: number | string, currency = "ETB"): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const cents = Math.round(n * 100) % 100 !== 0;
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 })}`;
}
