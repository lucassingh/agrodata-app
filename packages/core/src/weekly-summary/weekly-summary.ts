import { formatMoney, formatQuantity } from "../whatsapp/farm-event";

type Currency = "ARS" | "USD";
type ByCurrency = Partial<Record<Currency, number>>;

/** Números de la semana de un campo, ya calculados (ver `gatherWeeklySummary`). */
export interface WeeklySummaryData {
  fieldName: string;
  /** YYYY-MM-DD, inclusive. */
  from: string;
  to: string;
  expenses: { byCurrency: ByCurrency; topCategory: { name: string; amount: number; currency: Currency } | null };
  /** Los insumos más consumidos, ya ordenados. */
  consumption: { supply: string; quantity: number; unit: string | null; cost: number | null; currency: Currency | null }[];
  livestock: { births: number; purchases: number; sales: number; salesAmount: ByCurrency; deaths: number };
  tasks: { completed: number; pending: number };
  records: { total: number; fromWhatsApp: number };
  lowStock: { supply: string; quantity: number; unit: string | null }[];
  /** Tambo: litros de la semana y L/vaca/día (null si no hay registros). */
  milk: { liters: number; litersPerCowDay: number | null } | null;
  /** Pesadas de la semana con su ADPV contra la anterior del grupo. */
  weighings: { group: string; adpv: number | null }[];
  /** Tratamientos sanitarios pendientes que vencen pronto o ya vencieron. */
  sanitaryDue: { name: string; day: string }[];
}

const dayMonth = (isoDay: string) => `${isoDay.slice(8, 10)}/${isoDay.slice(5, 7)}`;

function moneyByCurrency(amounts: ByCurrency): string | null {
  const parts = (["ARS", "USD"] as const)
    .filter((currency) => (amounts[currency] ?? 0) > 0)
    .map((currency) => formatMoney(amounts[currency]!, currency));
  return parts.length > 0 ? parts.join(" + ") : null;
}

/** Hubo algo en la semana. Sin actividad no se manda nada (salvo stock bajo). */
export function hasActivity(data: WeeklySummaryData): boolean {
  const l = data.livestock;
  return (
    moneyByCurrency(data.expenses.byCurrency) !== null ||
    data.consumption.length > 0 ||
    l.births + l.purchases + l.sales + l.deaths > 0 ||
    data.tasks.completed + data.tasks.pending > 0 ||
    data.records.total > 0 ||
    data.lowStock.length > 0 ||
    data.milk !== null ||
    data.weighings.length > 0 ||
    data.sanitaryDue.length > 0
  );
}

function livestockParts(l: WeeklySummaryData["livestock"]): string[] {
  const parts: string[] = [];
  if (l.births > 0) parts.push(`+${l.births} ${l.births === 1 ? "nacimiento" : "nacimientos"}`);
  if (l.purchases > 0) parts.push(`+${l.purchases} ${l.purchases === 1 ? "comprado" : "comprados"}`);
  if (l.sales > 0) {
    const amount = moneyByCurrency(l.salesAmount);
    parts.push(`−${l.sales} ${l.sales === 1 ? "vendido" : "vendidos"}${amount ? ` (${amount})` : ""}`);
  }
  if (l.deaths > 0) parts.push(`−${l.deaths} por mortandad`);
  return parts;
}

/** Mensaje completo, con formato de WhatsApp. */
export function weeklySummaryText(data: WeeklySummaryData): string {
  const lines = [`*Resumen semanal · ${data.fieldName}*`, `Del ${dayMonth(data.from)} al ${dayMonth(data.to)}`, ""];

  const spent = moneyByCurrency(data.expenses.byCurrency);
  if (spent) {
    lines.push(`💸 Gastos: *${spent}*`);
    const top = data.expenses.topCategory;
    if (top) lines.push(`   El rubro más alto: ${top.name}, ${formatMoney(top.amount, top.currency)}`);
  }

  if (data.consumption.length > 0) {
    const items = data.consumption.map(
      (c) => `${c.supply} ${formatQuantity(c.quantity, c.unit)}${c.cost !== null ? ` (${formatMoney(c.cost, c.currency)})` : ""}`,
    );
    lines.push(`⛽ Consumos: ${items.join(" · ")}`);
  }

  const livestock = livestockParts(data.livestock);
  if (livestock.length > 0) lines.push(`🐄 Hacienda: ${livestock.join(" · ")}`);

  if (data.tasks.completed + data.tasks.pending > 0) {
    const pending = data.tasks.pending > 0 ? `, ${data.tasks.pending} ${data.tasks.pending === 1 ? "pendiente" : "pendientes"}` : "";
    lines.push(`✅ Tareas: ${data.tasks.completed} ${data.tasks.completed === 1 ? "completada" : "completadas"}${pending}`);
  }

  if (data.records.total > 0) {
    lines.push(`📝 Cargas: ${data.records.total} (${data.records.fromWhatsApp} por WhatsApp)`);
  }

  if (data.milk) {
    const perCow = data.milk.litersPerCowDay !== null ? ` (${formatQuantity(data.milk.litersPerCowDay, "L")} por vaca por día)` : "";
    lines.push(`🥛 Tambo: ${formatQuantity(data.milk.liters, "L")}${perCow}`);
  }

  if (data.weighings.length > 0) {
    const items = data.weighings.map((w) => (w.adpv !== null ? `${w.group} ${formatQuantity(w.adpv, "kg/día")}` : w.group));
    lines.push(`⚖️ Pesadas: ${items.join(" · ")}`);
  }

  if (data.sanitaryDue.length > 0) {
    lines.push(`💉 Sanidad por vencer: ${data.sanitaryDue.map((s) => `${s.name} (${dayMonth(s.day)})`).join(", ")}`);
  }

  if (data.lowStock.length > 0) {
    lines.push(`⚠️ Stock bajo: ${data.lowStock.map((s) => `${s.supply} (${formatQuantity(s.quantity, s.unit)})`).join(", ")}`);
  }

  lines.push("", 'Preguntame lo que necesites, por ejemplo "¿cuánto gasté este mes?".');
  return lines.join("\n");
}

/** Versión en una línea, para la plantilla de Meta (sus parámetros no admiten saltos de línea). */
export function weeklySummaryOneLine(data: WeeklySummaryData): string {
  const parts: string[] = [];
  const spent = moneyByCurrency(data.expenses.byCurrency);
  if (spent) parts.push(`gastos ${spent}`);
  parts.push(...livestockParts(data.livestock));
  if (data.tasks.completed > 0) parts.push(`${data.tasks.completed} tareas completadas`);
  if (data.records.total > 0) parts.push(`${data.records.total} cargas`);
  if (data.milk) parts.push(`${formatQuantity(data.milk.liters, "L")} de leche`);
  if (data.weighings.length > 0) parts.push(`${data.weighings.length} pesadas`);
  if (data.sanitaryDue.length > 0) parts.push(`sanidad por vencer: ${data.sanitaryDue.map((s) => s.name).join(", ")}`);
  if (data.lowStock.length > 0) parts.push(`stock bajo en ${data.lowStock.map((s) => s.supply).join(", ")}`);
  return parts.join(" · ") || "sin movimientos";
}

/** Los 7 días anteriores a hoy (de lunes a domingo si se corre un lunes). */
export function previousWeek(today: string): { from: string; to: string } {
  const shift = (days: number) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  return { from: shift(-7), to: shift(-1) };
}
