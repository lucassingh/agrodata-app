/** Cálculos de la economía por lote. Funciones puras: todo lo que muestra el
 *  módulo Economía (y lo que responde el bot) sale de acá. */

export type Currency = "ARS" | "USD";

/** Ciclo agrícola (julio a junio) de una fecha YYYY-MM-DD: octubre 2026 → "26/27". */
export function seasonOf(isoDay: string): string {
  const year = Number(isoDay.slice(0, 4));
  const month = Number(isoDay.slice(5, 7));
  const start = month >= 7 ? year : year - 1;
  const yy = (n: number) => String(n % 100).padStart(2, "0");
  return `${yy(start)}/${yy(start + 1)}`;
}

/** Cotización vigente en un día: la de ese día o la última anterior (fines de
 *  semana y feriados no tienen). `rates` ordenadas por día ascendente. */
export function rateOn(rates: { day: string; sell: number }[], isoDay: string): number | null {
  let found: number | null = null;
  for (const rate of rates) {
    if (rate.day > isoDay) break;
    found = rate.sell;
  }
  return found;
}

/** Un monto en las dos monedas. `rate` = pesos por dólar. Sin cotización, la otra moneda queda en null. */
export function inBothCurrencies(
  amount: number,
  currency: Currency,
  rate: number | null,
): { usd: number | null; ars: number | null } {
  if (currency === "USD") return { usd: amount, ars: rate ? amount * rate : null };
  return { ars: amount, usd: rate ? amount / rate : null };
}

/** Reparte un monto entre lotes según sus hectáreas. Redondea a centavos y el
 *  resto va al último, así la suma da exacto. Sin hectáreas, reparte en partes iguales. */
export function splitByHectares<T extends { hectares: number | null }>(amount: number, parts: T[]): (T & { amount: number })[] {
  if (parts.length === 0) return [];
  const known = parts.every((p) => (p.hectares ?? 0) > 0);
  const weights = parts.map((p) => (known ? p.hectares! : 1));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let assigned = 0;
  return parts.map((part, index) => {
    const share = index === parts.length - 1 ? round2(amount - assigned) : round2((amount * weights[index]!) / total);
    assigned += share;
    return { ...part, amount: share };
  });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface CampaignFigures {
  hectares: number | null;
  /** Costos directos ya convertidos (null donde no hubo cotización). */
  costs: { usd: number | null; ars: number | null }[];
  incomes: { usd: number | null; ars: number | null; quantityKg: number | null }[];
  harvestedKg: number;
  /** USD por tonelada, para estimar el ingreso si todavía no hubo ventas. */
  referencePrice: number | null;
}

export interface CampaignResult {
  costUsd: number;
  costArs: number;
  costPerHaUsd: number | null;
  yieldKgHa: number | null;
  incomeUsd: number;
  incomeArs: number;
  /** true si el ingreso sale del precio de referencia y no de ventas reales. */
  estimated: boolean;
  marginUsd: number;
  marginPerHaUsd: number | null;
  /** Precio en USD por tonelada usado para el ingreso y el rinde de indiferencia. */
  priceUsdPerTon: number | null;
  /** Kg por hectárea que cubren los costos directos a ese precio. */
  breakEvenYieldKgHa: number | null;
  /** Cuántos costos o ingresos no se pudieron pasar a dólares (sin cotización). */
  unconverted: number;
}

export function campaignResult(figures: CampaignFigures): CampaignResult {
  const sum = (values: (number | null)[]) => values.reduce<number>((total, v) => total + (v ?? 0), 0);
  const ha = figures.hectares && figures.hectares > 0 ? figures.hectares : null;

  const costUsd = sum(figures.costs.map((c) => c.usd));
  const costArs = sum(figures.costs.map((c) => c.ars));
  const unconverted =
    figures.costs.filter((c) => c.usd === null).length + figures.incomes.filter((i) => i.usd === null).length;

  const soldKg = sum(figures.incomes.map((i) => i.quantityKg));
  const realIncomeUsd = sum(figures.incomes.map((i) => i.usd));
  const salePrice = soldKg > 0 && realIncomeUsd > 0 ? (realIncomeUsd / soldKg) * 1000 : null;
  const priceUsdPerTon = salePrice ?? figures.referencePrice;

  const hasSales = figures.incomes.length > 0;
  const estimated = !hasSales && figures.referencePrice !== null && figures.harvestedKg > 0;
  const incomeUsd = hasSales ? realIncomeUsd : estimated ? (figures.harvestedKg / 1000) * figures.referencePrice! : 0;
  const incomeArs = hasSales ? sum(figures.incomes.map((i) => i.ars)) : 0;

  const marginUsd = incomeUsd - costUsd;
  const costPerHaUsd = ha ? costUsd / ha : null;

  return {
    costUsd: round2(costUsd),
    costArs: round2(costArs),
    costPerHaUsd: costPerHaUsd !== null ? round2(costPerHaUsd) : null,
    yieldKgHa: ha && figures.harvestedKg > 0 ? Math.round(figures.harvestedKg / ha) : null,
    incomeUsd: round2(incomeUsd),
    incomeArs: round2(incomeArs),
    estimated,
    marginUsd: round2(marginUsd),
    marginPerHaUsd: ha ? round2(marginUsd / ha) : null,
    priceUsdPerTon: priceUsdPerTon !== null ? round2(priceUsdPerTon) : null,
    breakEvenYieldKgHa:
      costPerHaUsd !== null && priceUsdPerTon ? Math.round((costPerHaUsd / priceUsdPerTon) * 1000) : null,
    unconverted,
  };
}

/** Rinde a partir de lo que dice el productor: kg/ha, qq/ha o toneladas/kg totales. */
export function harvestTotalKg(quantity: number, unit: string | null, hectares: number | null): number | null {
  const u = (unit ?? "").toLowerCase().replace(/\s+/g, "").replace(/\./g, "");
  if (["kg/ha", "kgha", "kilos/ha", "kilosporhectarea"].includes(u)) return hectares ? quantity * hectares : null;
  if (["qq/ha", "qqha", "quintales/ha", "quintalesporhectarea"].includes(u)) return hectares ? quantity * 100 * hectares : null;
  if (["t", "tn", "ton", "toneladas", "tonelada"].includes(u)) return quantity * 1000;
  if (["kg", "kilos", "kilo"].includes(u)) return quantity;
  if (["qq", "quintales", "quintal"].includes(u)) return quantity * 100;
  return null;
}
