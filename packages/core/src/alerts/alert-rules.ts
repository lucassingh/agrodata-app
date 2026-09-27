/** Reglas de los avisos (Etapa 5). Cada regla recibe datos ya leídos de la base
 *  y devuelve avisos que dicen de qué datos salen: la IA no decide qué es un
 *  problema. Cada una exige un mínimo de historia para no avisar de más.
 *  Puro: se testea sin base. */

import { adpv, milkSummary, type MilkDay, type WeighingPoint } from "../livestock/livestock-math";
import type { AlertKind, AlertSettings } from "./alert-settings";

/** critical: vencido, sin stock o perdiendo peso · warning: para esta semana · info: para mirar. */
export type AlertSeverity = "critical" | "warning" | "info";

export const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

export interface FieldAlert {
  /** Identifica el aviso entre días (para no mandarlo dos veces por WhatsApp). */
  key: string;
  kind: AlertKind;
  severity: AlertSeverity;
  /** Una línea: «Gasoil para 6 días». */
  title: string;
  /** De qué datos sale: «Consumiste 420 L en 30 días (14 L por día); quedan 84 L.» */
  detail: string;
}

const DAY_MS = 86_400_000;
const dayNumber = (day: string) => Math.round(Date.parse(`${day}T12:00:00Z`) / DAY_MS);
const daysBetween = (from: string, to: string) => dayNumber(to) - dayNumber(from);
const addDays = (day: string, days: number) => new Date(Date.parse(`${day}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

const number = (value: number, digits = 0) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
const fixed = (value: number, digits: number) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
const shortDay = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;
const money = (amount: number, currency: "ARS" | "USD") => (currency === "USD" ? `US$ ${number(amount)}` : `$ ${number(amount)}`);
const withUnit = (quantity: number, unit: string | null) => (unit ? `${number(quantity, 1)} ${unit}` : number(quantity, 1));

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const monthName = (month: string) => MONTHS[Number(month.slice(5, 7)) - 1]!;

// ── Stock ──────────────────────────────────────────────────

export interface StockInput {
  id: string;
  name: string;
  unit: string | null;
  quantity: number;
  minStock: number | null;
  /** Consumido en los últimos 30 días (salidas de stock, sin ajustes). */
  consumedLast30: number;
}

/** Un aviso por insumo: si al ritmo del último mes no llega a los días de
 *  cobertura, o si quedó debajo del mínimo que tiene cargado. Sin consumo y sin
 *  mínimo no hay con qué medir: no avisa. */
export function stockAlerts(supplies: StockInput[], coverageDays: number): FieldAlert[] {
  const alerts: FieldAlert[] = [];
  for (const s of supplies) {
    const dailyRate = s.consumedLast30 / 30;
    const belowMin = s.minStock !== null && s.quantity <= s.minStock;
    const minNote = belowMin ? ` El mínimo es ${withUnit(s.minStock!, s.unit)}.` : "";
    if (dailyRate > 0) {
      const daysLeft = Math.max(0, s.quantity) / dailyRate;
      if (daysLeft < coverageDays) {
        alerts.push({
          key: `stock:${s.id}`,
          kind: "STOCK",
          severity: s.quantity <= 0 || daysLeft <= 3 ? "critical" : "warning",
          title: s.quantity <= 0 ? `${s.name} sin stock` : `${s.name} para ${Math.floor(daysLeft)} ${Math.floor(daysLeft) === 1 ? "día" : "días"}`,
          detail: `Consumiste ${withUnit(s.consumedLast30, s.unit)} en los últimos 30 días (${withUnit(dailyRate, s.unit)} por día); quedan ${withUnit(Math.max(0, s.quantity), s.unit)}.${minNote}`,
        });
        continue;
      }
    }
    if (belowMin) {
      alerts.push({
        key: `stock:${s.id}`,
        kind: "STOCK",
        severity: s.quantity <= 0 ? "critical" : "warning",
        title: s.quantity <= 0 ? `${s.name} sin stock` : `${s.name} debajo del mínimo`,
        detail: `Quedan ${withUnit(Math.max(0, s.quantity), s.unit)}.${minNote}`,
      });
    }
  }
  return alerts;
}

// ── Sanidad y tareas ───────────────────────────────────────

export interface PendingTaskInput {
  id: string;
  /** «Aftosa», «Pulverización» … */
  name: string;
  /** YYYY-MM-DD */
  deadline: string;
  pasture: string | null;
}

const where = (pasture: string | null) => (pasture ? ` en ${pasture}` : "");

/** Tratamientos pendientes vencidos, o que vencen dentro de los días de anticipación. */
export function sanitaryAlerts(tasks: PendingTaskInput[], today: string, leadDays: number): FieldAlert[] {
  const alerts: FieldAlert[] = [];
  for (const t of tasks) {
    const days = daysBetween(today, t.deadline);
    if (days < 0) {
      alerts.push({
        key: `sanitary:${t.id}`,
        kind: "SANITARY",
        severity: "critical",
        title: `${t.name}: venció el ${shortDay(t.deadline)}`,
        detail: `Tratamiento sanitario pendiente${where(t.pasture)}, con fecha ${shortDay(t.deadline)}.`,
      });
    } else if (days <= leadDays) {
      alerts.push({
        key: `sanitary:${t.id}`,
        kind: "SANITARY",
        severity: "warning",
        title: days === 0 ? `${t.name}: vence hoy` : `${t.name}: vence el ${shortDay(t.deadline)}`,
        detail: `Tratamiento sanitario pendiente${where(t.pasture)}, ${days === 0 ? "con fecha de hoy" : `en ${days} ${days === 1 ? "día" : "días"}`}.`,
      });
    }
  }
  return alerts;
}

/** Tareas pendientes (no sanitarias) con la fecha pasada. */
export function overdueTaskAlerts(tasks: PendingTaskInput[], today: string): FieldAlert[] {
  return tasks
    .filter((t) => daysBetween(today, t.deadline) < 0)
    .map((t) => ({
      key: `task:${t.id}`,
      kind: "TASKS" as const,
      severity: "warning" as const,
      title: `${t.name}${where(t.pasture)}: venció el ${shortDay(t.deadline)}`,
      detail: `Tarea pendiente desde hace ${daysBetween(t.deadline, today)} ${daysBetween(t.deadline, today) === 1 ? "día" : "días"}.`,
    }));
}

// ── Aumento de peso ────────────────────────────────────────

export interface WeighingGroupInput {
  key: string;
  /** «Novillos · Lote 1» */
  name: string;
  /** Ordenadas por fecha. */
  weighings: WeighingPoint[];
}

/** Una pesada de hace más de esto ya no dice nada del presente. */
const MAX_WEIGHING_AGE_DAYS = 60;

/** Compara el aumento diario entre las dos últimas pesadas con el de las dos
 *  anteriores. Hacen falta 3 pesadas, y la última reciente. */
export function adpvAlerts(groups: WeighingGroupInput[], today: string, dropPct: number): FieldAlert[] {
  const alerts: FieldAlert[] = [];
  for (const g of groups) {
    const w = g.weighings;
    if (w.length < 3) continue;
    const [a, b, c] = [w[w.length - 3]!, w[w.length - 2]!, w[w.length - 1]!];
    if (daysBetween(c.day, today) > MAX_WEIGHING_AGE_DAYS) continue;
    const previous = adpv(a, b);
    const last = adpv(b, c);
    if (previous === null || last === null) continue;
    const between = `entre el ${shortDay(b.day)} y el ${shortDay(c.day)}`;
    if (last < 0) {
      alerts.push({
        key: `adpv:${g.key}`,
        kind: "ADPV",
        severity: "critical",
        title: `${g.name} pierde peso`,
        detail: `Bajaron ${fixed(-last, 2)} kg por día ${between} (de ${number(b.averageKg)} a ${number(c.averageKg)} kg).`,
      });
    } else if (previous > 0 && last <= previous * (1 - dropPct / 100)) {
      const drop = Math.round((1 - last / previous) * 100);
      alerts.push({
        key: `adpv:${g.key}`,
        kind: "ADPV",
        severity: "warning",
        title: `${g.name}: el aumento diario cayó ${drop} %`,
        detail: `Pasó de ${fixed(previous, 2)} a ${fixed(last, 2)} kg por día ${between}.`,
      });
    }
  }
  return alerts;
}

// ── Tambo ──────────────────────────────────────────────────

const MIN_MILK_DAYS = 5;

/** Litros por vaca de los últimos 7 días contra los 7 anteriores, con al menos
 *  5 días cargados (con vacas en ordeñe) en cada semana. */
export function milkAlerts(days: MilkDay[], today: string, dropPct: number): FieldAlert[] {
  const inRange = (from: string, to: string) =>
    days.filter((d) => d.day >= from && d.day <= to && d.cowsMilking && d.cowsMilking > 0);
  const lastWeek = inRange(addDays(today, -6), today);
  const previousWeek = inRange(addDays(today, -13), addDays(today, -7));
  if (lastWeek.length < MIN_MILK_DAYS || previousWeek.length < MIN_MILK_DAYS) return [];
  const last = milkSummary(lastWeek).litersPerCowDay;
  const previous = milkSummary(previousWeek).litersPerCowDay;
  if (last === null || previous === null || previous <= 0) return [];
  if (last > previous * (1 - dropPct / 100)) return [];
  const drop = Math.round((1 - last / previous) * 100);
  return [
    {
      key: "milk",
      kind: "MILK",
      severity: "warning",
      title: `Litros por vaca: bajaron ${drop} %`,
      detail: `De ${fixed(previous, 1)} a ${fixed(last, 1)} litros por vaca por día (últimos 7 días contra los 7 anteriores).`,
    },
  ];
}

// ── Gastos ─────────────────────────────────────────────────

export interface MonthlyExpenseInput {
  categoryId: string;
  category: string;
  currency: "ARS" | "USD";
  /** YYYY-MM */
  month: string;
  amount: number;
}

const previousMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};

/** Una categoría que en el mes supera `factor` veces su promedio de los 3 meses
 *  anteriores. Solo categorías con gastos en cada uno de esos 3 meses: las de
 *  temporada (semillas, fertilizantes) avisarían en cada siembra. Pesos y
 *  dólares por separado. */
export function expenseAlerts(expenses: MonthlyExpenseInput[], currentMonth: string, factor: number): FieldAlert[] {
  const m1 = previousMonth(currentMonth);
  const m2 = previousMonth(m1);
  const m3 = previousMonth(m2);
  const byKey = new Map<string, { category: string; currency: "ARS" | "USD"; months: Map<string, number> }>();
  for (const e of expenses) {
    const key = `${e.categoryId}:${e.currency}`;
    const entry = byKey.get(key) ?? { category: e.category, currency: e.currency, months: new Map() };
    entry.months.set(e.month, (entry.months.get(e.month) ?? 0) + e.amount);
    byKey.set(key, entry);
  }
  const alerts: FieldAlert[] = [];
  for (const [key, entry] of byKey) {
    const history = [m1, m2, m3].map((m) => entry.months.get(m) ?? 0);
    if (history.some((amount) => amount <= 0)) continue;
    const average = history.reduce((sum, a) => sum + a, 0) / 3;
    const current = entry.months.get(currentMonth) ?? 0;
    if (current <= average * factor) continue;
    alerts.push({
      key: `expense:${key}:${currentMonth}`,
      kind: "EXPENSES",
      severity: "info",
      title: `${entry.category}: ${fixed(current / average, 1)} veces lo normal en ${monthName(currentMonth)}`,
      detail: `${money(current, entry.currency)} en ${monthName(currentMonth)}, contra un promedio de ${money(average, entry.currency)} entre ${monthName(m3)} y ${monthName(m1)}.`,
    });
  }
  return alerts;
}

// ── Todo junto ─────────────────────────────────────────────

export interface FieldAlertInput {
  today: string;
  supplies: StockInput[];
  sanitaryTasks: PendingTaskInput[];
  otherTasks: PendingTaskInput[];
  weighingGroups: WeighingGroupInput[];
  milkDays: MilkDay[];
  monthlyExpenses: MonthlyExpenseInput[];
}

/** Los avisos prendidos de un campo, de los más graves a los más leves. */
export function evaluateAlerts(input: FieldAlertInput, settings: AlertSettings): FieldAlert[] {
  const on = settings.enabled;
  const alerts = [
    ...(on.STOCK ? stockAlerts(input.supplies, settings.stockCoverageDays) : []),
    ...(on.SANITARY ? sanitaryAlerts(input.sanitaryTasks, input.today, settings.sanitaryLeadDays) : []),
    ...(on.TASKS ? overdueTaskAlerts(input.otherTasks, input.today) : []),
    ...(on.ADPV ? adpvAlerts(input.weighingGroups, input.today, settings.adpvDropPct) : []),
    ...(on.MILK ? milkAlerts(input.milkDays, input.today, settings.milkDropPct) : []),
    ...(on.EXPENSES ? expenseAlerts(input.monthlyExpenses, input.today.slice(0, 7), settings.expenseFactor) : []),
  ];
  return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
