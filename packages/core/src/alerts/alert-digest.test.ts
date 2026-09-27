import { describe, expect, it } from "vitest";
import { alertDigestOneLine, alertDigestText, alertsToSend } from "./alert-digest";
import type { FieldAlert } from "./alert-rules";

const alert = (key: string, severity: FieldAlert["severity"], title: string): FieldAlert => ({
  key,
  kind: "STOCK",
  severity,
  title,
  detail: `Detalle de ${title}.`,
});

const NOW = new Date("2026-09-28T11:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000);

describe("qué avisos van", () => {
  const alerts = [alert("a", "critical", "Aftosa: venció el 24/09"), alert("b", "warning", "Gasoil para 6 días")];

  it("los nuevos van; los ya mandados, recién a los 7 días y marcados como recordatorio", () => {
    expect(alertsToSend(alerts, [], NOW).map((p) => [p.alert.key, p.reminder])).toEqual([
      ["a", false],
      ["b", false],
    ]);
    expect(alertsToSend(alerts, [{ alertKey: "a", sentAt: daysAgo(1) }], NOW).map((p) => p.alert.key)).toEqual(["b"]);
    expect(alertsToSend(alerts, [{ alertKey: "a", sentAt: daysAgo(7) }, { alertKey: "b", sentAt: daysAgo(2) }], NOW)).toEqual([
      { alert: alerts[0], reminder: true },
    ]);
  });

  it("cuenta el último envío, y el cron de la semana siguiente no se corre un día por segundos", () => {
    const sevenDaysMinusSeconds = new Date(NOW.getTime() - 7 * 86_400_000 + 30_000);
    expect(alertsToSend(alerts, [{ alertKey: "a", sentAt: daysAgo(20) }, { alertKey: "a", sentAt: daysAgo(1) }], NOW)[0]!.alert.key).toBe("b");
    expect(alertsToSend([alerts[0]!], [{ alertKey: "a", sentAt: sevenDaysMinusSeconds }], NOW)).toHaveLength(1);
  });
});

describe("el mensaje", () => {
  const pending = [
    { alert: alert("a", "critical", "Aftosa: venció el 24/09"), reminder: false },
    { alert: alert("b", "warning", "Gasoil para 6 días"), reminder: true },
  ];

  it("texto completo con la gravedad, el detalle y el link al Resumen", () => {
    expect(alertDigestText("La Esperanza", pending, "https://agrodata.app/dashboard/summary")).toBe(
      [
        "*Avisos de La Esperanza*",
        "",
        "🔴 Aftosa: venció el 24/09",
        "Detalle de Aftosa: venció el 24/09.",
        "",
        "🟠 Gasoil para 6 días (sigue pendiente)",
        "Detalle de Gasoil para 6 días.",
        "",
        "Los ves todos en el Resumen: https://agrodata.app/dashboard/summary",
      ].join("\n"),
    );
  });

  it("una línea para la plantilla, cortada con «y N más»", () => {
    expect(alertDigestOneLine(pending)).toBe("2 avisos: Aftosa: venció el 24/09 · Gasoil para 6 días");
    expect(alertDigestOneLine([pending[0]!])).toBe("1 aviso: Aftosa: venció el 24/09");
    const many = Array.from({ length: 30 }, (_, i) => ({ alert: alert(`k${i}`, "warning", `Insumo número ${i} para 3 días`), reminder: false }));
    const line = alertDigestOneLine(many, 120);
    expect(line.length).toBeLessThanOrEqual(120);
    expect(line).toMatch(/^30 avisos: Insumo número 0 para 3 días · .* · y \d+ más$/);
    expect(line).not.toMatch(/\n|\t/);
  });
});
