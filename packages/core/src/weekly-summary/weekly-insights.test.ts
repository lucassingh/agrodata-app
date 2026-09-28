import { describe, expect, it } from "vitest";
import { insightFacts, keepGroundedInsights } from "./weekly-insights";
import { weeklySummaryText, type WeeklySummaryData } from "./weekly-summary";

const data: WeeklySummaryData = {
  fieldName: "La Esperanza",
  from: "2026-09-14",
  to: "2026-09-20",
  expenses: { byCurrency: { ARS: 1235000 }, topCategory: { name: "Semillas", amount: 800000, currency: "ARS" } },
  consumption: [{ supply: "Gasoil", quantity: 300, unit: "L", cost: 360000, currency: "ARS" }],
  livestock: { births: 12, purchases: 0, sales: 0, salesAmount: {}, deaths: 1 },
  tasks: { completed: 4, pending: 1 },
  records: { total: 18, fromWhatsApp: 15 },
  lowStock: [],
  milk: { liters: 16800, litersPerCowDay: 22.4 },
  weighings: [{ group: "Novillos · Lote 1", adpv: 0.88 }],
  sanitaryDue: [],
};

const alerts = [
  { key: "stock:g", kind: "STOCK" as const, severity: "warning" as const, title: "Gasoil para 6 días", detail: "Consumiste 420 L en los últimos 30 días (14 L por día); quedan 84 L." },
];

describe("conclusiones del resumen semanal", () => {
  const facts = insightFacts(data, alerts);

  it("los datos que recibe Claude incluyen los números de la semana y los avisos", () => {
    expect(facts).toContain("Gastos: *$ 1.235.000*");
    expect(facts).toContain("- Gasoil para 6 días: Consumiste 420 L");
  });

  it("se queda solo con las conclusiones cuyos números salen de los datos", () => {
    const kept = keepGroundedInsights(
      [
        "El gasoil alcanza para 6 días al ritmo de 14 L por día: conviene reponer esta semana.",
        "Los novillos ganaron 0,88 kg por día; mantené la dieta.",
        "Semillas fue el rubro más alto con $ 800.000.",
        // 65 % es una cuenta propia: no está en los datos.
        "Semillas fue el 65 % del gasto de la semana.",
        // 45 no figura en ningún lado.
        "Con 45 días de stock estarías tranquilo.",
      ],
      facts,
    );
    expect(keepGroundedInsights(["Semillas fue el 65 % del gasto de la semana.", "Con 45 días de stock estarías tranquilo."], facts)).toEqual([]);
    expect(kept).toEqual([
      "El gasoil alcanza para 6 días al ritmo de 14 L por día: conviene reponer esta semana.",
      "Los novillos ganaron 0,88 kg por día; mantené la dieta.",
      "Semillas fue el rubro más alto con $ 800.000.",
    ]);
  });

  it("como mucho tres, sin vacías ni larguísimas", () => {
    const many = ["Hubo 12 nacimientos.", "", "Se cargaron 18 datos.", "Hay 1 tarea pendiente.", "Una más sin números.", "x".repeat(400)];
    expect(keepGroundedInsights(many, facts)).toEqual(["Hubo 12 nacimientos.", "Se cargaron 18 datos.", "Hay 1 tarea pendiente."]);
  });

  it("el mensaje las muestra al final, antes de la invitación a preguntar", () => {
    const text = weeklySummaryText({ ...data, insights: ["Conviene reponer gasoil esta semana."] });
    expect(text).toContain("💡 *Para tener en cuenta*\n• Conviene reponer gasoil esta semana.\n\nPreguntame lo que necesites");
    expect(weeklySummaryText(data)).not.toContain("Para tener en cuenta");
  });
});
