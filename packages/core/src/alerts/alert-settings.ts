/** Configuración de los avisos de un campo (Etapa 5): cuáles están prendidos y
 *  sus valores. Se guarda como JSON en `AlertSettings.settings`; lo que falte
 *  toma el valor por defecto, así un campo que nunca configuró nada tiene todos
 *  los avisos con valores conservadores. Puro: se testea sin base. */

import { z } from "zod";

export const ALERT_KINDS = ["STOCK", "SANITARY", "TASKS", "IDLE_LOT", "ADPV", "MILK", "EXPENSES"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export const ALERT_KIND_LABEL: Record<AlertKind, string> = {
  STOCK: "Stock que se acaba",
  SANITARY: "Sanidad por vencer o vencida",
  TASKS: "Tareas vencidas",
  IDLE_LOT: "Lote sin labores",
  ADPV: "Aumento de peso en caída",
  MILK: "Litros por vaca en caída",
  EXPENSES: "Gasto fuera de lo normal",
};

export const ALERT_KIND_HINT: Record<AlertKind, string> = {
  STOCK: "Cuando un insumo alcanza para pocos días al ritmo de consumo del último mes, o queda debajo de su mínimo.",
  SANITARY: "Tratamientos pendientes que vencen pronto o ya vencieron.",
  TASKS: "Siembras, pulverizaciones y fertilizaciones pendientes con la fecha pasada.",
  IDLE_LOT: "Un lote con cultivo en curso donde no se cargó ninguna labor, aplicación ni gasto en esa cantidad de días.",
  ADPV: "Un grupo que engorda bastante menos que en la pesada anterior, o que pierde peso. Necesita 3 pesadas.",
  MILK: "Los litros por vaca de la última semana contra la anterior. Necesita 5 días cargados en cada una.",
  EXPENSES: "Una categoría que gasta mucho más que su promedio de los 3 meses anteriores. Solo categorías con gastos todos los meses.",
};

const kindFlags = z.object(Object.fromEntries(ALERT_KINDS.map((kind) => [kind, z.boolean()])) as Record<AlertKind, z.ZodBoolean>);

export const alertSettingsSchema = z.object({
  enabled: kindFlags,
  /** Días que tiene que alcanzar un insumo al ritmo de consumo actual. */
  stockCoverageDays: z.number().int().min(1).max(120),
  /** Días de anticipación para avisar un tratamiento sanitario. */
  sanitaryLeadDays: z.number().int().min(0).max(60),
  /** Días sin labores en un lote con cultivo en curso. */
  idleLotDays: z.number().int().min(7).max(120),
  /** Caída del aumento diario, en porcentaje, contra la pesada anterior. */
  adpvDropPct: z.number().min(5).max(90),
  /** Caída de los litros por vaca por día, en porcentaje, semana contra semana. */
  milkDropPct: z.number().min(2).max(90),
  /** Veces el gasto mensual promedio de una categoría. */
  expenseFactor: z.number().min(1.1).max(10),
});
export type AlertSettings = z.infer<typeof alertSettingsSchema>;

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  enabled: { STOCK: true, SANITARY: true, TASKS: true, IDLE_LOT: true, ADPV: true, MILK: true, EXPENSES: true },
  stockCoverageDays: 14,
  sanitaryLeadDays: 7,
  idleLotDays: 30,
  adpvDropPct: 30,
  milkDropPct: 10,
  expenseFactor: 1.5,
};

/** El JSON guardado sobre los valores por defecto. Un valor inválido vuelve a su
 *  valor por defecto en lugar de romper los avisos. */
export function resolveAlertSettings(stored: unknown): AlertSettings {
  const input = stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  const enabledInput = input.enabled && typeof input.enabled === "object" ? (input.enabled as Record<string, unknown>) : {};
  const enabled = Object.fromEntries(
    ALERT_KINDS.map((kind) => [kind, typeof enabledInput[kind] === "boolean" ? enabledInput[kind] : DEFAULT_ALERT_SETTINGS.enabled[kind]]),
  ) as AlertSettings["enabled"];
  const pick = <K extends Exclude<keyof AlertSettings, "enabled">>(key: K): AlertSettings[K] => {
    const parsed = alertSettingsSchema.shape[key].safeParse(input[key]);
    return parsed.success ? (parsed.data as AlertSettings[K]) : DEFAULT_ALERT_SETTINGS[key];
  };
  return {
    enabled,
    stockCoverageDays: pick("stockCoverageDays"),
    sanitaryLeadDays: pick("sanitaryLeadDays"),
    idleLotDays: pick("idleLotDays"),
    adpvDropPct: pick("adpvDropPct"),
    milkDropPct: pick("milkDropPct"),
    expenseFactor: pick("expenseFactor"),
  };
}
