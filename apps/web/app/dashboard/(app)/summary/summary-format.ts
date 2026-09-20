/** Puerto de `formatRelativeDate` del legacy -- local a esta pantalla, NO es el
 *  mismo formateador que usa Datos (ese muestra fecha+hora absoluta siempre).
 *  Diff en múltiplos de 24hs crudos, no anclado a medianoche -- "Ayer" puede
 *  ser impreciso cerca de la medianoche, igual que el legacy. */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", timeZone: "America/Argentina/Buenos_Aires" });
}

/** Siempre ARS, sin conversión -- el legacy suma `Expense.amount` crudo sin
 *  importar la moneda real de cada gasto (mismo gap que en Gastos, ver §7.7 de
 *  CLAUDE.md). Se replica el mismo formateo simple acá. */
export function formatArs(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(
    amount,
  );
}
