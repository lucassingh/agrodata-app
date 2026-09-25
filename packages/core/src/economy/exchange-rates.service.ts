import "server-only";
import { prisma } from "@repo/database";
import { todayInArgentina } from "../whatsapp/farm-event";
import { parseCurrentRates, parseHistoricalRates, type ExchangeRateKind, type ParsedRate } from "./exchange-rates";

const CURRENT_URL = "https://dolarapi.com/v1/dolares";
const HISTORY_URL = "https://api.argentinadatos.com/v1/cotizaciones/dolares";

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Cotizaciones: ${url} respondió HTTP ${response.status}`);
  return response.json();
}

/** Guarda la cotización del momento (pisa la del día: queda el último valor). */
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
