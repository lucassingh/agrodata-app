import { backfillRates, countExchangeRates, refreshCurrentRates } from "@repo/core";
import { inngest } from "../client";

/** Mantiene las cotizaciones del dólar al día: cada 30 minutos en horario hábil
 *  (hora argentina) guarda el valor del momento. Si la tabla está vacía (base
 *  nueva), primero carga el histórico completo. */
export const refreshExchangeRates = inngest.createFunction(
  {
    id: "refresh-exchange-rates",
    retries: 2,
    triggers: [{ cron: "TZ=America/Argentina/Buenos_Aires */30 10-18 * * 1-5" }],
  },
  async ({ step }) => {
    const existing = await step.run("count-rates", () => countExchangeRates());
    const backfilled = existing === 0 ? await step.run("backfill-history", () => backfillRates()) : 0;
    const current = await step.run("refresh-current", () => refreshCurrentRates());
    return { backfilled, current };
  },
);
