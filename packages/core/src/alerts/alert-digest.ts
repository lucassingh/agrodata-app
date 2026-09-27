/** El mensaje diario de avisos por WhatsApp (Etapa 5): qué avisos van y cómo se
 *  escriben. Un aviso va si es nuevo para esa persona, o si sigue abierto y
 *  pasaron 7 días desde que se le mandó. Puro: se testea sin base. */

import type { AlertSeverity, FieldAlert } from "./alert-rules";

export const REMIND_AFTER_DAYS = 7;

/** El cron corre todos los días a la misma hora, con segundos de diferencia:
 *  medio día de margen para que el recordatorio no se corra al día 8. */
const REMIND_AFTER_MS = (REMIND_AFTER_DAYS - 0.5) * 86_400_000;

export interface PendingAlert {
  alert: FieldAlert;
  /** Ya se le había mandado y sigue abierto. */
  reminder: boolean;
}

/** Los avisos que le tocan hoy a una persona, según lo que ya se le mandó. */
export function alertsToSend(
  alerts: FieldAlert[],
  deliveries: { alertKey: string; sentAt: Date }[],
  now: Date,
): PendingAlert[] {
  const lastSent = new Map<string, number>();
  for (const d of deliveries) {
    lastSent.set(d.alertKey, Math.max(lastSent.get(d.alertKey) ?? 0, d.sentAt.getTime()));
  }
  const pending: PendingAlert[] = [];
  for (const alert of alerts) {
    const last = lastSent.get(alert.key);
    if (last === undefined) pending.push({ alert, reminder: false });
    else if (now.getTime() - last >= REMIND_AFTER_MS) pending.push({ alert, reminder: true });
  }
  return pending;
}

const MARK: Record<AlertSeverity, string> = { critical: "🔴", warning: "🟠", info: "⚪" };

/** El mensaje completo, para cuando la persona escribió en las últimas 24 hs. */
export function alertDigestText(fieldName: string, pending: PendingAlert[], summaryUrl?: string): string {
  const lines = [`*Avisos de ${fieldName}*`, ""];
  for (const { alert, reminder } of pending) {
    lines.push(`${MARK[alert.severity]} ${alert.title}${reminder ? " (sigue pendiente)" : ""}`, alert.detail, "");
  }
  if (summaryUrl) lines.push(`Los ves todos en el Resumen: ${summaryUrl}`);
  return lines.join("\n").trimEnd();
}

/** Para la plantilla de Meta: una sola línea (sin saltos ni tabulaciones) y corta. */
export function alertDigestOneLine(pending: PendingAlert[], maxLength = 700): string {
  const head = pending.length === 1 ? "1 aviso: " : `${pending.length} avisos: `;
  const titles = pending.map(({ alert }) => alert.title.replace(/\s+/g, " "));
  let text = head;
  for (let i = 0; i < titles.length; i++) {
    const rest = titles.length - i - 1;
    const next = `${i > 0 ? " · " : ""}${titles[i]}`;
    const tail = rest > 0 ? ` · y ${rest} más` : "";
    if ((text + next + tail).length > maxLength) {
      return `${text}${i > 0 ? " · " : ""}y ${titles.length - i} más`;
    }
    text += next;
  }
  return text;
}
