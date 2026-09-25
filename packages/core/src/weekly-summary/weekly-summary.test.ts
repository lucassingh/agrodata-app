import { describe, expect, it } from "vitest";
import { hasActivity, previousWeek, weeklySummaryOneLine, weeklySummaryText, type WeeklySummaryData } from "./weekly-summary";

const empty: WeeklySummaryData = {
  fieldName: "La Esperanza",
  from: "2026-09-14",
  to: "2026-09-20",
  expenses: { byCurrency: {}, topCategory: null },
  consumption: [],
  livestock: { births: 0, purchases: 0, sales: 0, salesAmount: {}, deaths: 0 },
  tasks: { completed: 0, pending: 0 },
  records: { total: 0, fromWhatsApp: 0 },
  lowStock: [],
};

const busy: WeeklySummaryData = {
  ...empty,
  expenses: { byCurrency: { ARS: 1235000, USD: 2000 }, topCategory: { name: "Semillas", amount: 800000, currency: "ARS" } },
  consumption: [{ supply: "Gasoil", quantity: 300, unit: "L", cost: 360000, currency: "ARS" }],
  livestock: { births: 12, purchases: 0, sales: 3, salesAmount: { ARS: 2700000 }, deaths: 1 },
  tasks: { completed: 4, pending: 1 },
  records: { total: 18, fromWhatsApp: 15 },
  lowStock: [{ supply: "Vacuna aftosa", quantity: 3, unit: "dosis" }],
};

describe("resumen semanal", () => {
  it("una semana sin nada no se manda", () => {
    expect(hasActivity(empty)).toBe(false);
    expect(hasActivity(busy)).toBe(true);
  });

  it("arma el mensaje solo con las líneas que tienen datos", () => {
    expect(weeklySummaryText(busy)).toBe(
      [
        "*Resumen semanal · La Esperanza*",
        "Del 14/09 al 20/09",
        "",
        "💸 Gastos: *$ 1.235.000 + USD 2.000*",
        "   El rubro más alto: Semillas, $ 800.000",
        "⛽ Consumos: Gasoil 300 L ($ 360.000)",
        "🐄 Hacienda: +12 nacimientos · −3 vendidos ($ 2.700.000) · −1 por mortandad",
        "✅ Tareas: 4 completadas, 1 pendiente",
        "📝 Cargas: 18 (15 por WhatsApp)",
        "⚠️ Stock bajo: Vacuna aftosa (3 dosis)",
        "",
        'Preguntame lo que necesites, por ejemplo "¿cuánto gasté este mes?".',
      ].join("\n"),
    );
  });

  it("la versión para la plantilla va en una sola línea", () => {
    const line = weeklySummaryOneLine(busy);
    expect(line).not.toContain("\n");
    expect(line).toBe(
      "gastos $ 1.235.000 + USD 2.000 · +12 nacimientos · −3 vendidos ($ 2.700.000) · −1 por mortandad · 4 tareas completadas · 18 cargas · stock bajo en Vacuna aftosa",
    );
  });
});

describe("previousWeek", () => {
  it("un lunes cubre de lunes a domingo anteriores", () => {
    expect(previousWeek("2026-09-28")).toEqual({ from: "2026-09-21", to: "2026-09-27" });
  });

  it("cruza bien el fin de mes", () => {
    expect(previousWeek("2026-10-05")).toEqual({ from: "2026-09-28", to: "2026-10-04" });
  });
});
