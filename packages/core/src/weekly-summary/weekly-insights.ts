/** Conclusiones del resumen semanal (Etapa 5): los datos que recibe Claude y el
 *  control de que no invente números. Puro: se testea sin base. */

import type { FieldAlert } from "../alerts/alert-rules";
import { weeklySummaryText, type WeeklySummaryData } from "./weekly-summary";

export const MAX_INSIGHTS = 3;
const MAX_INSIGHT_LENGTH = 280;

/** Lo que Claude puede usar: los números de la semana (el mismo texto que se
 *  manda) y los avisos abiertos con su detalle. */
export function insightFacts(data: WeeklySummaryData, alerts: FieldAlert[]): string {
  const summary = weeklySummaryText({ ...data, insights: [] });
  const open = alerts.map((a) => `- ${a.title}: ${a.detail}`);
  return [summary, "", "Avisos abiertos del campo:", ...(open.length > 0 ? open : ["- Ninguno"])].join("\n");
}

/** «1.200.000» → 1200000, «0,88» → 0.88, «24» → 24. */
function numericValue(token: string): number {
  if (token.includes(",")) return Number(token.replace(/\./g, "").replace(",", "."));
  if (/^\d{1,3}(\.\d{3})+$/.test(token)) return Number(token.replace(/\./g, ""));
  return Number(token);
}

const numbersIn = (text: string) => (text.match(/\d+(?:[.,]\d+)*/g) ?? []).map(numericValue);

/** Solo las conclusiones cuyos números salen todos de los datos: una que hace
 *  una cuenta propia (un porcentaje, un total) se descarta entera. */
export function keepGroundedInsights(insights: string[], facts: string): string[] {
  const known = new Set(numbersIn(facts));
  return insights
    .map((insight) => insight.replace(/\s+/g, " ").trim())
    .filter((insight) => insight.length > 0 && insight.length <= MAX_INSIGHT_LENGTH)
    .filter((insight) => numbersIn(insight).every((n) => known.has(n)))
    .slice(0, MAX_INSIGHTS);
}
