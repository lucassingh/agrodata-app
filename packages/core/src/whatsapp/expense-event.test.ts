import { describe, expect, it } from "vitest";
import {
  buildExpenseInput,
  formatMoney,
  isExpenseEvent,
  newCategoryQuestion,
  todayInArgentina,
  type ExpenseEventData,
} from "./expense-event";

const fuelPurchase: ExpenseEventData = {
  type: "FUEL_USAGE",
  summary: "Carga de 500 L de gasoil",
  occurredAt: null,
  monto: 1284500,
  moneda: null,
  contraparte: "Agro Pampa SRL",
  categoria: "Combustible",
};

describe("isExpenseEvent", () => {
  it("es gasto una factura, compra o combustible con monto", () => {
    expect(isExpenseEvent(fuelPurchase)).toBe(true);
    expect(isExpenseEvent({ ...fuelPurchase, type: "PURCHASE" })).toBe(true);
    expect(isExpenseEvent({ ...fuelPurchase, type: "EXPENSE_INVOICE" })).toBe(true);
  });

  it("no es gasto sin monto (queda para la etapa de stock)", () => {
    expect(isExpenseEvent({ ...fuelPurchase, monto: null })).toBe(false);
    expect(isExpenseEvent({ ...fuelPurchase, monto: 0 })).toBe(false);
  });

  it("no es gasto un evento de campo aunque mencione plata", () => {
    expect(isExpenseEvent({ ...fuelPurchase, type: "SEEDING" })).toBe(false);
    expect(isExpenseEvent({ ...fuelPurchase, type: "SALE" })).toBe(false);
  });
});

describe("todayInArgentina", () => {
  it("usa el huso de Argentina, no UTC", () => {
    // 02:00 UTC del 25/09 todavía es 24/09 en Argentina (UTC-3).
    expect(todayInArgentina(new Date("2026-09-25T02:00:00Z"))).toBe("2026-09-24");
  });
});

describe("buildExpenseInput", () => {
  const now = new Date("2026-09-25T15:00:00Z");

  it("arma el gasto con moneda ARS por defecto y la fecha de hoy", () => {
    expect(buildExpenseInput(fuelPurchase, "cat-1", now)).toEqual({
      categoryId: "cat-1",
      amount: 1284500,
      currency: "ARS",
      date: "2026-09-25",
      description: "Carga de 500 L de gasoil (Agro Pampa SRL)",
    });
  });

  it("respeta la fecha y la moneda del mensaje", () => {
    const input = buildExpenseInput({ ...fuelPurchase, occurredAt: "2026-09-20", moneda: "USD", contraparte: null }, "c", now);
    expect(input.date).toBe("2026-09-20");
    expect(input.currency).toBe("USD");
    expect(input.description).toBe("Carga de 500 L de gasoil");
  });

  it("no repite el proveedor si el resumen ya lo nombra", () => {
    const input = buildExpenseInput(
      { ...fuelPurchase, summary: "Carga de gasoil en Estación de Venado", contraparte: "estacion de venado" },
      "c",
      now,
    );
    expect(input.description).toBe("Carga de gasoil en Estación de Venado");
  });

  it("falla si no hay monto", () => {
    expect(() => buildExpenseInput({ ...fuelPurchase, monto: null }, "c", now)).toThrow();
  });
});

describe("textos para WhatsApp", () => {
  it("formatea montos en pesos y dólares", () => {
    expect(formatMoney(1284500, "ARS")).toBe("$ 1.284.500");
    expect(formatMoney(4320.5, "USD")).toBe("USD 4.320,5");
  });

  it("la pregunta nombra la categoría y el monto", () => {
    expect(newCategoryQuestion(fuelPurchase, "Combustible")).toBe(
      "No tenés una categoría de gasto «Combustible». ¿La creo y cargo el gasto de $ 1.284.500 ahí? Respondé sí o no.",
    );
  });
});
