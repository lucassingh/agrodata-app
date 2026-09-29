import "server-only";
import { prisma } from "@repo/database";
import { onlyActiveFields } from "../billing/billing.service";
import { waIdFromWNumber } from "../whatsapp/wa-id";
import { OUTSIDE_24H_WINDOW, sendWhatsAppTemplate, sendWhatsAppText, WhatsAppSendError } from "../whatsapp/whatsapp-client";
import { alertDigestOneLine, alertDigestText, alertsToSend, REMIND_AFTER_DAYS } from "./alert-digest";
import { getFieldAlerts } from "./alerts.service";

export interface AlertTarget {
  tenantId: string;
  fieldName: string;
  recipients: { userId: string; waId: string }[];
}

export type AlertDeliveryResult = "text" | "template" | "nothing" | "no-template" | "failed";

const argentinaDay = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(date);

/** A quién le llegan los avisos: dueño, encargado y asesor de cada campo, con
 *  WhatsApp cargado y sin haberlos apagado. Los operarios no. */
export async function alertTargets(): Promise<AlertTarget[]> {
  const memberships = await prisma.userTenantMembership.findMany({
    where: {
      status: "ACTIVE",
      role: { in: ["OWNER", "ADMIN", "ADVISOR"] },
      whatsappAlerts: true,
      user: { wNumber: { not: null } },
    },
    include: { user: { select: { id: true, wNumber: true } }, tenant: { select: { id: true, name: true } } },
  });
  const targets = new Map<string, AlertTarget>();
  for (const m of memberships) {
    const waId = m.user.wNumber ? waIdFromWNumber(m.user.wNumber) : null;
    if (!waId) continue;
    const target = targets.get(m.tenantId) ?? { tenantId: m.tenantId, fieldName: m.tenant.name, recipients: [] };
    target.recipients.push({ userId: m.user.id, waId });
    targets.set(m.tenantId, target);
  }
  // En modo lectura (venció el plan) el campo no recibe avisos.
  return onlyActiveFields([...targets.values()]);
}

/** Texto si la persona escribió en las últimas 24 hs; si no, la plantilla
 *  aprobada en Meta (WHATSAPP_ALERTS_TEMPLATE, con el campo y los avisos en
 *  una línea). Sin plantilla configurada, no se puede mandar. */
async function sendDigest(waId: string, text: string, fieldName: string, oneLine: string): Promise<"text" | "template" | "no-template"> {
  try {
    await sendWhatsAppText(waId, text);
    return "text";
  } catch (error) {
    if (!(error instanceof WhatsAppSendError) || error.code !== OUTSIDE_24H_WINDOW) throw error;
    const template = process.env.WHATSAPP_ALERTS_TEMPLATE;
    if (!template) return "no-template";
    await sendWhatsAppTemplate(waId, {
      name: template,
      language: process.env.WHATSAPP_ALERTS_TEMPLATE_LANG || "es_AR",
      bodyParams: [fieldName, oneLine],
    });
    return "template";
  }
}

/** Manda los avisos de hoy de un campo a cada destinatario: solo los nuevos
 *  para esa persona y los abiertos que no se le mandan hace 7 días. Registra
 *  cada envío, así un reintento no repite lo que ya salió. */
export async function deliverFieldAlerts(
  target: AlertTarget,
  now = new Date(),
): Promise<{ userId: string; result: AlertDeliveryResult; alerts: number }[]> {
  const alerts = await getFieldAlerts(target.tenantId, argentinaDay(now));
  if (alerts.length === 0) return target.recipients.map((r) => ({ userId: r.userId, result: "nothing", alerts: 0 }));

  const since = new Date(now.getTime() - (REMIND_AFTER_DAYS + 1) * 86_400_000);
  const deliveries = await prisma.alertDelivery.findMany({
    where: {
      tenantId: target.tenantId,
      userId: { in: target.recipients.map((r) => r.userId) },
      alertKey: { in: alerts.map((a) => a.key) },
      sentAt: { gte: since },
    },
    select: { userId: true, alertKey: true, sentAt: true },
  });
  const summaryUrl = process.env.AUTH_URL ? `${process.env.AUTH_URL.replace(/\/$/, "")}/dashboard/summary` : undefined;

  const results: { userId: string; result: AlertDeliveryResult; alerts: number }[] = [];
  for (const recipient of target.recipients) {
    const pending = alertsToSend(alerts, deliveries.filter((d) => d.userId === recipient.userId), now);
    if (pending.length === 0) {
      results.push({ userId: recipient.userId, result: "nothing", alerts: 0 });
      continue;
    }
    try {
      const result = await sendDigest(
        recipient.waId,
        alertDigestText(target.fieldName, pending, summaryUrl),
        target.fieldName,
        alertDigestOneLine(pending),
      );
      if (result !== "no-template") {
        await prisma.alertDelivery.createMany({
          data: pending.map(({ alert }) => ({ tenantId: target.tenantId, userId: recipient.userId, alertKey: alert.key, sentAt: now })),
        });
      }
      results.push({ userId: recipient.userId, result, alerts: pending.length });
    } catch (error) {
      console.error("[alerts] no se pudo mandar", { tenantId: target.tenantId, userId: recipient.userId, error });
      results.push({ userId: recipient.userId, result: "failed", alerts: pending.length });
    }
  }
  return results;
}
