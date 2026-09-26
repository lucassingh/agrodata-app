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
  /** Kilos totales de hacienda comprada o vendida. */
  kilos: number | null;
  monto: number | null;
  moneda: "ARS" | "USD" | null;
  contraparte: string | null;
  dosis: string | null;
  /** Rubro del gasto o del insumo. */
  categoria: string | null;
  /** Datos propios de tambo, pesadas y reproducción (segunda lectura del mensaje). */
  detail?: EventDetail | null;
}

export interface MilkProductionDetail {
  kind: "MILK_PRODUCTION";
  liters: number | null;
  cowsMilking: number | null;
  cowsDry: number | null;
}

export interface MilkSettlementDetail {
  kind: "MILK_SETTLEMENT";
  dairy: string | null;
  /** YYYY-MM-DD */
  periodStart: string | null;
  periodEnd: string | null;
  liters: number | null;
  fatPct: number | null;
  proteinPct: number | null;
  pricePerLiter: number | null;
  totalAmount: number | null;
  currency: "ARS" | "USD" | null;
}

export interface WeighingDetail {
  kind: "WEIGHING";
  groups: { pasture: string | null; animalType: string | null; headCount: number | null; averageKg: number | null }[];
}

export interface ReproductionDetail {
  kind: "REPRODUCTION";
  /** Los partos no son un evento reproductivo del bot: van como nacimientos. */
  event: "SERVICE_START" | "PREGNANCY_CHECK" | "WEANING" | null;
  rodeo: string | null;
  animalType: string | null;
  females: number | null;
  pregnant: number | null;
  empty: number | null;
  weaned: number | null;
}

export interface SanitaryDetail {
  kind: "SANITARY_TREATMENT";
  /** Próxima dosis o refuerzo, YYYY-MM-DD, si el mensaje la menciona. */
  nextDose: string | null;
}

export type EventDetail = MilkProductionDetail | MilkSettlementDetail | WeighingDetail | ReproductionDetail | SanitaryDetail;

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
