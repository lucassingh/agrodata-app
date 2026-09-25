import type { CreateExpenseInput } from "../expenses/expenses.schema";
import { normalizeEntityName } from "./entity-name";

/** Subconjunto de lo que extrae Claude que hace falta para cargar un gasto.
 *  Se define acá (y no se importa de `@repo/ai`) para que `core` no dependa del
 *  paquete de IA: el que orquesta (la función de Inngest) pasa estos campos. */
export interface ExpenseEventData {
  type: string;
  summary: string;
  occurredAt: string | null;
  monto: number | null;
  moneda: "ARS" | "USD" | null;
  contraparte: string | null;
  categoria: string | null;
}

/** Tipos de evento que, si traen monto, generan un gasto real en Gastos
 *  (Etapa 1 de la Slice C). Sin monto quedan solo en el historial de Datos
 *  hasta la Etapa 2 (stock de Insumos). */
export const EXPENSE_EVENT_TYPES = ["EXPENSE_INVOICE", "PURCHASE", "FUEL_USAGE"] as const;

export function isExpenseEvent(event: ExpenseEventData): boolean {
  return (
    (EXPENSE_EVENT_TYPES as readonly string[]).includes(event.type) && event.monto !== null && event.monto > 0
  );
}

/** Fecha de hoy en Argentina como YYYY-MM-DD (mismo formato que un
 *  `<input type="date">` del dashboard, que es lo que espera `createExpense`). */
export function todayInArgentina(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

export function buildExpenseInput(event: ExpenseEventData, categoryId: string, now: Date = new Date()): CreateExpenseInput {
  if (event.monto === null || event.monto <= 0) {
    throw new Error("buildExpenseInput necesita un evento con monto positivo");
  }
  // El proveedor se agrega solo si el resumen de Claude no lo nombra ya.
  const mentionsCounterpart =
    event.contraparte !== null && normalizeEntityName(event.summary).includes(normalizeEntityName(event.contraparte));
  const description =
    event.contraparte && !mentionsCounterpart ? `${event.summary} (${event.contraparte})` : event.summary;
  return {
    categoryId,
    amount: event.monto,
    currency: event.moneda ?? "ARS",
    date: event.occurredAt ?? todayInArgentina(now),
    description: description.slice(0, 500),
  };
}

export function formatMoney(amount: number, currency: "ARS" | "USD" | null): string {
  const formatted = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(amount);
  return currency === "USD" ? `USD ${formatted}` : `$ ${formatted}`;
}

export function newCategoryQuestion(event: ExpenseEventData, categoryName: string): string {
  const amount = event.monto !== null ? formatMoney(event.monto, event.moneda) : "";
  return `No tenés una categoría de gasto «${categoryName}». ¿La creo y cargo el gasto de ${amount} ahí? Respondé sí o no.`;
}
