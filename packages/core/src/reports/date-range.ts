const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export interface DateRange {
  /** YYYY-MM-DD, inclusive. */
  from?: string;
  /** YYYY-MM-DD, inclusive. */
  to?: string;
}

/** Filtro de Prisma para un rango de días en hora argentina: `from` desde las
 *  00:00 y `to` hasta las 23:59:59.999 de ese día. Fechas mal formadas se
 *  ignoran (sin filtro de ese lado). `undefined` si no hay rango. */
export function dateRangeFilter(range: DateRange = {}): { gte?: Date; lte?: Date } | undefined {
  const from = range.from && DATE_ONLY.test(range.from) ? new Date(`${range.from}T00:00:00-03:00`) : undefined;
  const to = range.to && DATE_ONLY.test(range.to) ? new Date(`${range.to}T23:59:59.999-03:00`) : undefined;
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
}

/** Igual que `dateRangeFilter`, para campos de solo fecha (gastos, vencimientos):
 *  se guardan a medianoche UTC, así que el día se compara en UTC. En hora
 *  argentina un gasto del día 1 caería en el día anterior. */
export function dateOnlyRangeFilter(range: DateRange = {}): { gte?: Date; lte?: Date } | undefined {
  const from = range.from && DATE_ONLY.test(range.from) ? new Date(`${range.from}T00:00:00Z`) : undefined;
  const to = range.to && DATE_ONLY.test(range.to) ? new Date(`${range.to}T23:59:59.999Z`) : undefined;
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
}
