/** Lo que Claude extrajo de un mensaje de WhatsApp, en la forma que necesita
 *  `core` para decidir sus efectos. Se define acá (y no se importa de
 *  `@repo/ai`) para que `core` no dependa del paquete de IA: la función de
 *  Inngest pasa estos campos. Mismo significado que `extractedEventSchema`. */
export interface FarmEvent {
  type: string;
  summary: string;
  occurredAt: string | null;
  potrero: string | null;
  destinoPotrero: string | null;
  cultivo: string | null;
  hectareas: number | null;
  /** Cabezas en eventos con animales; cantidad de `producto` en los demás. */
  cantidad: number | null;
  unidad: string | null;
  /** Categoría de animal. */
  item: string | null;
  /** Insumo involucrado. */
  producto: string | null;
  movimientoStock: "INGRESO" | "EGRESO" | "NINGUNO";
  monto: number | null;
  moneda: "ARS" | "USD" | null;
  contraparte: string | null;
  dosis: string | null;
  /** Rubro del gasto o del insumo. */
  categoria: string | null;
}

/** Fecha de hoy en Argentina como YYYY-MM-DD (mismo formato que un
 *  `<input type="date">` del dashboard). */
export function todayInArgentina(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

export function formatMoney(amount: number, currency: "ARS" | "USD" | null): string {
  const formatted = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(amount);
  return currency === "USD" ? `USD ${formatted}` : `$ ${formatted}`;
}

export function formatQuantity(quantity: number, unit: string | null): string {
  const formatted = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(quantity);
  return unit ? `${formatted} ${unit}` : formatted;
}
