/** Umbral de "stock bajo" (heredado del legacy): igual para el dashboard, el Resumen y el resumen semanal. */
export const LOW_STOCK_THRESHOLD = 5;

/** Saldo que queda tras un movimiento y cuánto se movió de verdad: un consumo
 *  nunca deja el stock en negativo (mismo criterio que el legacy), así que se
 *  registra por lo que había. */
export function nextStock(
  current: number,
  direction: "in" | "out",
  quantity: number,
): { balance: number; moved: number } {
  if (direction === "in") return { balance: current + quantity, moved: quantity };
  const moved = Math.min(current, quantity);
  return { balance: current - moved, moved };
}

/** Costo unitario de una compra: monto total dividido cantidad. */
export function unitCostOf(amount: number | null, quantity: number): number | null {
  if (amount === null || amount <= 0 || quantity <= 0) return null;
  return amount / quantity;
}
