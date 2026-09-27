/** Período del informe del asesor: un mes («2026-09») o una campaña agrícola
 *  («26/27», de julio a junio). Nunca pasa de hoy. Puro: se testea sin base. */

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export type ReportPeriodInput = { kind: "month"; month: string } | { kind: "season"; season: string };

export interface ReportPeriod {
  from: string;
  to: string;
  label: string;
  /** Campaña agrícola que cubre el período (para la economía por lote). */
  season: string;
}

const yy = (n: number) => String(n % 100).padStart(2, "0");

function lastDayOfMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

export function reportPeriod(input: ReportPeriodInput, today: string): ReportPeriod | null {
  if (input.kind === "month") {
    const match = /^(\d{4})-(\d{2})$/.exec(input.month);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) return null;
    const from = `${input.month}-01`;
    if (from > today) return null;
    const end = lastDayOfMonth(year, month);
    const start = month >= 7 ? year : year - 1;
    return {
      from,
      to: end < today ? end : today,
      label: `${MONTHS[month - 1]} de ${year}`,
      season: `${yy(start)}/${yy(start + 1)}`,
    };
  }
  const match = /^(\d{2})\/(\d{2})$/.exec(input.season);
  if (!match || (Number(match[1]) + 1) % 100 !== Number(match[2])) return null;
  const start = 2000 + Number(match[1]);
  const from = `${start}-07-01`;
  if (from > today) return null;
  const end = `${start + 1}-06-30`;
  return { from, to: end < today ? end : today, label: `campaña ${input.season}`, season: input.season };
}
