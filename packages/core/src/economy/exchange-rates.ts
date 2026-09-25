/** Lectura de las APIs públicas de cotizaciones (dolarapi.com y argentinadatos.com).
 *  Las dos nombran igual cada tipo de dólar ("casa"). Puro: se testea sin red. */

export const EXCHANGE_RATE_KINDS = ["MAYORISTA", "OFICIAL", "BLUE", "BOLSA", "CONTADOCONLIQUI", "CRIPTO", "TARJETA"] as const;
export type ExchangeRateKind = (typeof EXCHANGE_RATE_KINDS)[number];

export const EXCHANGE_RATE_LABEL: Record<ExchangeRateKind, string> = {
  MAYORISTA: "Mayorista",
  OFICIAL: "Oficial",
  BLUE: "Blue",
  BOLSA: "MEP",
  CONTADOCONLIQUI: "Contado con liquidación",
  CRIPTO: "Cripto",
  TARJETA: "Tarjeta",
};

export interface ParsedRate {
  kind: ExchangeRateKind;
  day: string;
  buy: number;
  sell: number;
}

function kindOf(casa: unknown): ExchangeRateKind | null {
  const kind = String(casa ?? "").toUpperCase();
  return (EXCHANGE_RATE_KINDS as readonly string[]).includes(kind) ? (kind as ExchangeRateKind) : null;
}

function isRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** dolarapi.com/v1/dolares: la cotización del momento. El día es el de Argentina. */
export function parseCurrentRates(json: unknown, argentinaToday: string): ParsedRate[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((row: Record<string, unknown>) => {
    const kind = kindOf(row.casa);
    if (!kind || !isRate(row.venta)) return [];
    return [{ kind, day: argentinaToday, buy: isRate(row.compra) ? row.compra : row.venta, sell: row.venta }];
  });
}

/** argentinadatos.com/v1/cotizaciones/dolares: histórico completo, una fila por día y tipo. */
export function parseHistoricalRates(json: unknown): ParsedRate[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((row: Record<string, unknown>) => {
    const kind = kindOf(row.casa);
    const day = typeof row.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.fecha) ? row.fecha : null;
    if (!kind || !day || !isRate(row.venta)) return [];
    return [{ kind, day, buy: isRate(row.compra) ? row.compra : row.venta, sell: row.venta }];
  });
}
