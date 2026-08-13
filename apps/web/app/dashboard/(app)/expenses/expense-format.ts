/** El legacy usa siempre locale es-AR incluso para USD (formato de agrupación
 *  argentino) y nunca muestra decimales, para ninguna de las dos monedas. */
export function formatExpenseAmount(amount: number, currency: "ARS" | "USD"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
