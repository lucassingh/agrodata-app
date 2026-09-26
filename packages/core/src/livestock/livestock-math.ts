/** Cálculos de ganadería y tambo. Funciones puras: los tableros, el bot y la
 *  exportación sacan sus números de acá. */

const DAY_MS = 86_400_000;
const round = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY_MS);

export interface WeighingPoint {
  /** YYYY-MM-DD */
  day: string;
  headCount: number;
  averageKg: number;
}

/** Aumento diario de peso vivo entre dos pesadas (kg/día). Null si son del mismo día. */
export function adpv(previous: WeighingPoint, last: WeighingPoint): number | null {
  const days = daysBetween(previous.day, last.day);
  if (days <= 0) return null;
  return round((last.averageKg - previous.averageKg) / days, 3);
}

export interface GroupPerformance {
  lastDay: string | null;
  lastAverageKg: number | null;
  headCount: number | null;
  adpv: number | null;
  /** Días entre las dos últimas pesadas. */
  periodDays: number | null;
  /** Kg ganados por hectárea entre las dos últimas pesadas. */
  kgProducedPerHa: number | null;
  /** Carga: kg de peso vivo por hectárea (última pesada). */
  liveKgPerHa: number | null;
  headsPerHa: number | null;
}

/** Rendimiento de un grupo (categoría en un potrero) a partir de sus pesadas. */
export function groupPerformance(weighings: WeighingPoint[], hectares: number | null): GroupPerformance {
  const sorted = [...weighings].sort((a, b) => a.day.localeCompare(b.day));
  const last = sorted.at(-1) ?? null;
  const previous = sorted.length > 1 ? sorted.at(-2)! : null;
  const ha = hectares && hectares > 0 ? hectares : null;
  const gain = last && previous ? adpv(previous, last) : null;
  const periodDays = last && previous ? daysBetween(previous.day, last.day) : null;
  return {
    lastDay: last?.day ?? null,
    lastAverageKg: last?.averageKg ?? null,
    headCount: last?.headCount ?? null,
    adpv: gain,
    periodDays,
    kgProducedPerHa:
      gain !== null && ha && last && periodDays ? round((gain * last.headCount * periodDays) / ha, 1) : null,
    liveKgPerHa: last && ha ? round((last.averageKg * last.headCount) / ha, 1) : null,
    headsPerHa: last && ha ? round(last.headCount / ha, 2) : null,
  };
}

export interface ReproCounts {
  type: "SERVICE_START" | "PREGNANCY_CHECK" | "WEANING";
  day: string;
  /** Rodeo (null = sin rodeo). */
  rodeo: string | null;
  females: number | null;
  pregnant: number | null;
  empty: number | null;
  weaned: number | null;
}

export interface ReproIndices {
  females: number | null;
  pregnant: number | null;
  empty: number | null;
  births: number;
  weaned: number;
  pregnancyPct: number | null;
  calvingPct: number | null;
  weaningPct: number | null;
}

/** Índices de una temporada de servicio del campo. Por cada rodeo cuenta el
 *  último inicio de servicio y el último tacto, y los suma. Vacas en servicio:
 *  las informadas o, si no, las del tacto (preñadas + vacías). Los partos vienen
 *  aparte (son nacimientos del historial de hacienda). */
export function reproIndices(events: ReproCounts[], births: number): ReproIndices {
  const byRodeo = new Map<string, { service?: ReproCounts; check?: ReproCounts }>();
  let weaned = 0;
  for (const e of [...events].sort((x, y) => x.day.localeCompare(y.day))) {
    const entry = byRodeo.get(e.rodeo ?? "") ?? {};
    if (e.type === "SERVICE_START") entry.service = e;
    if (e.type === "PREGNANCY_CHECK" && e.pregnant !== null && e.empty !== null) entry.check = e;
    if (e.type === "WEANING") weaned += e.weaned ?? 0;
    byRodeo.set(e.rodeo ?? "", entry);
  }

  let females = 0;
  let pregnant = 0;
  let empty = 0;
  let checked = false;
  for (const { service, check } of byRodeo.values()) {
    if (check) {
      checked = true;
      pregnant += check.pregnant!;
      empty += check.empty!;
    }
    females += service?.females ?? (check ? check.pregnant! + check.empty! : 0);
  }
  const pct = (value: number, base: number) => (base > 0 ? round((value / base) * 100, 1) : null);

  return {
    females: females > 0 ? females : null,
    pregnant: checked ? pregnant : null,
    empty: checked ? empty : null,
    births,
    weaned,
    pregnancyPct: checked ? pct(pregnant, pregnant + empty) : null,
    calvingPct: births > 0 ? pct(births, females) : null,
    weaningPct: weaned > 0 ? pct(weaned, females) : null,
  };
}

export interface MilkDay {
  day: string;
  liters: number;
  cowsMilking: number | null;
}

/** Litros por vaca en ordeño de un día. */
export function litersPerCow(day: MilkDay): number | null {
  return day.cowsMilking && day.cowsMilking > 0 ? round(day.liters / day.cowsMilking, 1) : null;
}

/** Resumen de un período del tambo: litros, promedio diario y L/vaca/día. */
export function milkSummary(days: MilkDay[]) {
  const liters = days.reduce((sum, d) => sum + d.liters, 0);
  const withCows = days.filter((d) => d.cowsMilking && d.cowsMilking > 0);
  const cowDays = withCows.reduce((sum, d) => sum + d.cowsMilking!, 0);
  const litersWithCows = withCows.reduce((sum, d) => sum + d.liters, 0);
  return {
    days: days.length,
    liters: round(liters, 1),
    litersPerDay: days.length > 0 ? round(liters / days.length, 1) : null,
    litersPerCowDay: cowDays > 0 ? round(litersWithCows / cowDays, 1) : null,
  };
}

/** Margen sobre alimentación por litro: precio por litro menos alimento por litro. */
export function feedMargin(input: { incomePerLiter: number | null; feedCost: number; liters: number }) {
  const feedCostPerLiter = input.liters > 0 ? round(input.feedCost / input.liters, 2) : null;
  const marginPerLiter =
    input.incomePerLiter !== null && feedCostPerLiter !== null ? round(input.incomePerLiter - feedCostPerLiter, 2) : null;
  return {
    incomePerLiter: input.incomePerLiter !== null ? round(input.incomePerLiter, 2) : null,
    feedCostPerLiter,
    marginPerLiter,
    marginTotal: marginPerLiter !== null ? round(marginPerLiter * input.liters, 2) : null,
  };
}

/** Precio por litro de una liquidación: el informado o total ÷ litros. */
export function settlementPricePerLiter(settlement: { pricePerLiter: number | null; totalAmount: number; liters: number }): number | null {
  if (settlement.pricePerLiter && settlement.pricePerLiter > 0) return settlement.pricePerLiter;
  return settlement.liters > 0 ? round(settlement.totalAmount / settlement.liters, 4) : null;
}

export interface WeighingRow {
  pasture: string;
  animalType: string;
  /** YYYY-MM-DD */
  day: string;
  /** Peso de un animal o promedio de un grupo. */
  kg: number;
  /** Cabezas del grupo; sin dato, la fila es un animal. */
  headCount: number | null;
}

/** Agrupa las filas de una planilla de pesadas por potrero, categoría y fecha, con
 *  el promedio ponderado. Una fila sin cantidad cuenta como un animal. */
export function aggregateWeighingRows(rows: WeighingRow[]) {
  const groups = new Map<string, { pasture: string; animalType: string; day: string; heads: number; totalKg: number }>();
  for (const row of rows) {
    const heads = row.headCount && row.headCount > 0 ? row.headCount : 1;
    const key = [row.pasture.trim().toLowerCase(), row.animalType.trim().toLowerCase(), row.day].join("|");
    const group = groups.get(key) ?? { pasture: row.pasture.trim(), animalType: row.animalType.trim(), day: row.day, heads: 0, totalKg: 0 };
    group.heads += heads;
    group.totalKg += row.kg * heads;
    groups.set(key, group);
  }
  return [...groups.values()].map((g) => ({
    pasture: g.pasture,
    animalType: g.animalType,
    day: g.day,
    headCount: g.heads,
    averageKg: round(g.totalKg / g.heads, 1),
  }));
}

const FEED_WORDS = ["alimento", "balanceado", "silo", "rollo", "fardo", "heno", "expeller", "burlanda", "concentrado", "suplemento", "racion", "pellet", "afrechillo", "sustituto lacteo", "leche en polvo"];

/** Insumo de alimentación animal: por la categoría (código ALIMENTO del legacy o
 *  nombre) o por el nombre del insumo. Su consumo es el costo de alimentación del tambo. */
export function isFeedSupply(input: { categoryCode: string | null; categoryName: string; supplyName: string }): boolean {
  if (input.categoryCode === "ALIMENTO") return true;
  const text = `${input.categoryName} ${input.supplyName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return FEED_WORDS.some((word) => text.includes(word));
}

/** Año de servicio al que pertenece un evento reproductivo (temporada de cría
 *  «2025/26» = servicio de primavera 2025). El ciclo dura más de un año, así que
 *  cada tipo de evento se ubica según su mes:
 *  - inicio de servicio: de julio en adelante, ese año; antes, el anterior;
 *  - tacto: de septiembre en adelante, ese año; antes, el anterior;
 *  - parto: del año anterior (servicio de primavera → parición al año siguiente);
 *  - destete: de julio en adelante, del año anterior; antes, de dos años atrás. */
export function serviceYearOf(type: "SERVICE_START" | "PREGNANCY_CHECK" | "CALVING" | "WEANING", day: string): number {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  switch (type) {
    case "SERVICE_START":
      return month >= 7 ? year : year - 1;
    case "PREGNANCY_CHECK":
      return month >= 9 ? year : year - 1;
    case "CALVING":
      return year - 1;
    case "WEANING":
      return month >= 7 ? year - 1 : year - 2;
  }
}

export function serviceSeasonLabel(serviceYear: number): string {
  return `${serviceYear}/${String((serviceYear + 1) % 100).padStart(2, "0")}`;
}
