import "server-only";
import { prisma } from "@repo/database";
import { todayInArgentina } from "../whatsapp/farm-event";
import {
  parseBcraRates,
  parseCurrentRates,
  parseHistoricalRates,
  type ExchangeRateKind,
  type ParsedRate,
} from "./exchange-rates";

const CURRENT_URL = "https://dolarapi.com/v1/dolares";
const HISTORY_URL = "https://api.argentinadatos.com/v1/cotizaciones/dolares";
/** API oficial del BCRA: el mayorista (A 3500). Los demás tipos de dólar no los publica. */
const BCRA_URL = (from: string, to: string) =>
  `https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones/USD?fechadesde=${from}&fechahasta=${to}`;
/** Desde cuándo se guarda el histórico (igual que el de argentinadatos.com). */
const HISTORY_FROM = "2011-01-01";

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Cotizaciones: ${url} respondió HTTP ${response.status}`);
  return response.json();
}

const shiftDay = (day: string, days: number) => {
  const date = asDate(day);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** Trae el mayorista oficial del BCRA entre dos fechas y pisa lo que haya para
 *  esos días (manda sobre dolarapi.com y argentinadatos.com). Se pide año por
 *  año: en rangos largos la API a veces no manda todas las filas. */
export async function syncBcraMayorista(fromDay: string, toDay: string): Promise<number> {
  let saved = 0;
  for (let year = Number(fromDay.slice(0, 4)); year <= Number(toDay.slice(0, 4)); year++) {
    const from = year === Number(fromDay.slice(0, 4)) ? fromDay : `${year}-01-01`;
    const to = year === Number(toDay.slice(0, 4)) ? toDay : `${year}-12-31`;
    const rates = parseBcraRates(await fetchJson(BCRA_URL(from, to)));
    if (rates.length === 0) continue;
    const lastPublished = rates.map((r) => r.day).sort().at(-1)!;
    await prisma.$transaction([
      // Se borra todo el mayorista del tramo que cubre el BCRA: también fines de semana
      // y feriados de otras fuentes (sin cotización se usa el último día hábil). Solo en
      // el tramo que llega a hoy se deja lo posterior al último día publicado: es el
      // valor del momento, que el BCRA todavía no informó.
      prisma.exchangeRate.deleteMany({
        where: {
          kind: "MAYORISTA",
          date: { gte: asDate(from), lte: asDate(to === toDay ? lastPublished : to) },
        },
      }),
      prisma.exchangeRate.createMany({
        data: rates.map((r) => ({ kind: r.kind, date: asDate(r.day), buy: r.buy, sell: r.sell, source: "bcra.gob.ar" })),
      }),
    ]);
    saved += rates.length;
  }
  return saved;
}

/** Guarda la cotización del momento (pisa la del día: queda el último valor) y
 *  después el mayorista oficial de los últimos días. Si el BCRA no responde,
 *  queda el mayorista de dolarapi.com (mismo valor en la práctica). */
export async function refreshCurrentRates(): Promise<number> {
  const rates = parseCurrentRates(await fetchJson(CURRENT_URL), todayInArgentina(new Date()));
  await prisma.$transaction(
    rates.map((rate) =>
      prisma.exchangeRate.upsert({
        where: { kind_date: { kind: rate.kind, date: asDate(rate.day) } },
        create: { kind: rate.kind, date: asDate(rate.day), buy: rate.buy, sell: rate.sell, source: "dolarapi.com" },
        update: { buy: rate.buy, sell: rate.sell, source: "dolarapi.com" },
      }),
    ),
  );
  const today = todayInArgentina(new Date());
  try {
    await syncBcraMayorista(shiftDay(today, -10), today);
  } catch (error) {
    console.error("[cotizaciones] el BCRA no respondió; queda el mayorista de dolarapi.com", error);
  }
  return rates.length;
}

/** Carga el histórico completo. No pisa lo que ya está (el valor del día que guarda
 *  `refreshCurrentRates` es más reciente que el del histórico). */
export async function backfillRates(): Promise<number> {
  const rates: ParsedRate[] = parseHistoricalRates(await fetchJson(HISTORY_URL));
  let inserted = 0;
  for (let i = 0; i < rates.length; i += 2000) {
    const chunk = rates.slice(i, i + 2000);
    const result = await prisma.exchangeRate.createMany({
      data: chunk.map((rate) => ({
        kind: rate.kind,
        date: asDate(rate.day),
        buy: rate.buy,
        sell: rate.sell,
        source: "argentinadatos.com",
      })),
      skipDuplicates: true,
    });
    inserted += result.count;
  }
  // El mayorista oficial pisa al de argentinadatos.com.
  await syncBcraMayorista(HISTORY_FROM, todayInArgentina(new Date()));
  return inserted;
}

export function countExchangeRates() {
  return prisma.exchangeRate.count();
}

/** Cotizaciones de un tipo desde una fecha (para convertir muchos montos de una vez). */
export async function ratesForKind(kind: ExchangeRateKind, fromDay?: string): Promise<{ day: string; sell: number }[]> {
  // Una semana antes del primer día pedido, para cubrir fines de semana y feriados.
  const from = fromDay ? new Date(asDate(fromDay).getTime() - 10 * 86_400_000) : undefined;
  const rows = await prisma.exchangeRate.findMany({
    where: { kind, ...(from ? { date: { gte: from } } : {}) },
    orderBy: { date: "asc" },
    select: { date: true, sell: true },
  });
  return rows.map((row) => ({ day: row.date.toISOString().slice(0, 10), sell: row.sell }));
}

/** Última cotización de cada tipo (el dólar del día en el dashboard). */
export async function latestRates() {
  const rows = await prisma.exchangeRate.findMany({
    distinct: ["kind"],
    orderBy: [{ kind: "asc" }, { date: "desc" }],
  });
  return rows.map((row) => ({ kind: row.kind, day: row.date.toISOString().slice(0, 10), buy: row.buy, sell: row.sell, updatedAt: row.updatedAt }));
}
