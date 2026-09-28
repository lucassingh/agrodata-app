import * as Sentry from "@sentry/nextjs";
import { alertTargets, deliverFieldAlerts } from "@repo/core";
import { inngest } from "../client";
import { alertsRequested } from "../events";

/** Avisos por WhatsApp de lunes a sábado a las 8 (hora argentina): un mensaje por
 *  campo y por persona, solo con avisos nuevos o recordatorios de 7 días. Cada
 *  campo es un paso propio: si falla uno, los demás igual salen. El evento
 *  `alertsRequested` permite dispararlo a mano (pruebas). */
export const sendDailyAlerts = inngest.createFunction(
  {
    id: "send-daily-alerts",
    retries: 2,
    triggers: [{ cron: "TZ=America/Argentina/Buenos_Aires 0 8 * * 1-6" }, { event: alertsRequested }],
  },
  async ({ step }) => {
    const targets = await step.run("load-targets", () => alertTargets());

    const outcomes: { tenantId: string; userId: string; result: string; alerts: number }[] = [];
    for (const target of targets) {
      // Un error de base hace que Inngest reintente el paso; si falla todas las
      // veces, se marca y siguen los demás campos. Los errores de envío de cada
      // persona ya los maneja deliverFieldAlerts.
      let results;
      try {
        results = await step.run(`send-${target.tenantId}`, () => deliverFieldAlerts(target));
      } catch (error) {
        console.error("[alerts] falló el campo", { tenantId: target.tenantId, error });
        Sentry.captureException(error, { tags: { flow: "daily-alerts" } });
        results = target.recipients.map((r) => ({ userId: r.userId, result: "failed" as const, alerts: 0 }));
      }
      outcomes.push(...results.map((r) => ({ tenantId: target.tenantId, ...r })));
    }
    return { outcomes };
  },
);
