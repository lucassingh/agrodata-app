import * as Sentry from "@sentry/nextjs";
import {
  deliverWeeklySummary,
  gatherWeeklySummary,
  hasActivity,
  previousWeek,
  todayInArgentina,
  weeklySummaryTargets,
} from "@repo/core";
import { inngest } from "../client";
import { weeklySummaryRequested } from "../events";

/** Resumen de la semana por WhatsApp, los lunes a las 8 (hora argentina), a
 *  quienes administran cada campo. Un campo sin movimientos no recibe nada.
 *  Cada envío es un paso propio: si falla uno, los demás igual salen.
 *  El evento `weeklySummaryRequested` permite dispararlo a mano (pruebas). */
export const sendWeeklySummary = inngest.createFunction(
  {
    id: "send-weekly-summary",
    retries: 2,
    triggers: [{ cron: "TZ=America/Argentina/Buenos_Aires 0 8 * * 1" }, { event: weeklySummaryRequested }],
  },
  async ({ step }) => {
    const period = await step.run("period", () => previousWeek(todayInArgentina(new Date())));
    const targets = await step.run("load-targets", () => weeklySummaryTargets());

    const outcomes: { tenantId: string; userId: string; result: string }[] = [];
    for (const target of targets) {
      const data = await step.run(`gather-${target.tenantId}`, () =>
        gatherWeeklySummary(target.tenantId, target.fieldName, period),
      );
      if (!hasActivity(data)) continue;

      for (const recipient of target.recipients) {
        const result = await step.run(`send-${target.tenantId}-${recipient.userId}`, async () => {
          try {
            return await deliverWeeklySummary(recipient.waId, data);
          } catch (error) {
            console.error("[weekly-summary] no se pudo mandar", { tenantId: target.tenantId, userId: recipient.userId, error });
            Sentry.captureException(error, { tags: { flow: "weekly-summary" } });
            return "failed" as const;
          }
        });
        outcomes.push({ tenantId: target.tenantId, userId: recipient.userId, result });
      }
    }
    return { period, outcomes };
  },
);
