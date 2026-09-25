import { describe, expect, it } from "vitest";
import { campaignResult, harvestTotalKg, inBothCurrencies, rateOn, seasonOf, splitByHectares } from "./economy-math";

describe("seasonOf", () => {
  it("de julio a junio", () => {
    expect(seasonOf("2026-10-15")).toBe("26/27");
    expect(seasonOf("2027-03-01")).toBe("26/27");
    expect(seasonOf("2026-06-30")).toBe("25/26");
    expect(seasonOf("2026-07-01")).toBe("26/27");
  });

  it("cruza bien el cambio de siglo", () => {
    expect(seasonOf("2099-08-01")).toBe("99/00");
  });
});

describe("rateOn", () => {
  const rates = [
    { day: "2026-09-24", sell: 1500 },
    { day: "2026-09-25", sell: 1525 },
    { day: "2026-09-28", sell: 1530 },
  ];

  it("usa la del día o la última anterior (fin de semana)", () => {
    expect(rateOn(rates, "2026-09-25")).toBe(1525);
    expect(rateOn(rates, "2026-09-27")).toBe(1525);
  });

  it("antes de la primera cotización no hay", () => {
    expect(rateOn(rates, "2026-09-01")).toBeNull();
  });
});

describe("inBothCurrencies", () => {
  it("pesos a dólares y dólares a pesos", () => {
    expect(inBothCurrencies(1_525_000, "ARS", 1525)).toEqual({ ars: 1_525_000, usd: 1000 });
    expect(inBothCurrencies(100, "USD", 1525)).toEqual({ usd: 100, ars: 152_500 });
  });

  it("sin cotización la otra moneda queda vacía", () => {
    expect(inBothCurrencies(5000, "ARS", null)).toEqual({ ars: 5000, usd: null });
  });
});

describe("splitByHectares", () => {
  it("reparte por hectáreas y la suma da exacto", () => {
    const parts = splitByHectares(1000, [
      { id: "a", hectares: 100 },
      { id: "b", hectares: 50 },
      { id: "c", hectares: 50 },
    ]);
    expect(parts.map((p) => p.amount)).toEqual([500, 250, 250]);
  });

  it("con decimales el resto va al último", () => {
    const parts = splitByHectares(100, [
      { id: "a", hectares: 1 },
      { id: "b", hectares: 1 },
      { id: "c", hectares: 1 },
    ]);
    expect(parts.map((p) => p.amount)).toEqual([33.33, 33.33, 33.34]);
  });

  it("si falta alguna superficie, reparte en partes iguales", () => {
    expect(splitByHectares(90, [{ hectares: 100 }, { hectares: null }]).map((p) => p.amount)).toEqual([45, 45]);
  });
});

describe("campaignResult", () => {
  const costs = [
    { usd: 30_000, ars: 45_750_000 },
    { usd: 10_000, ars: 15_250_000 },
  ];

  it("margen con ventas reales, costo por ha y rinde de indiferencia", () => {
    const result = campaignResult({
      hectares: 100,
      costs,
      incomes: [{ usd: 96_000, ars: 146_400_000, quantityKg: 300_000 }],
      harvestedKg: 320_000,
      referencePrice: null,
    });
    expect(result).toMatchObject({
      costUsd: 40_000,
      costPerHaUsd: 400,
      yieldKgHa: 3200,
      incomeUsd: 96_000,
      estimated: false,
      marginUsd: 56_000,
      marginPerHaUsd: 560,
      priceUsdPerTon: 320,
      breakEvenYieldKgHa: 1250,
      unconverted: 0,
    });
  });

  it("sin ventas estima con el precio de referencia", () => {
    const result = campaignResult({ hectares: 100, costs, incomes: [], harvestedKg: 320_000, referencePrice: 300 });
    expect(result.estimated).toBe(true);
    expect(result.incomeUsd).toBe(96_000);
    expect(result.breakEvenYieldKgHa).toBe(1333);
  });

  it("en curso, sin cosecha: solo costos", () => {
    const result = campaignResult({ hectares: 100, costs, incomes: [], harvestedKg: 0, referencePrice: 300 });
    expect(result).toMatchObject({ incomeUsd: 0, estimated: false, marginUsd: -40_000, yieldKgHa: null, breakEvenYieldKgHa: 1333 });
  });

  it("cuenta lo que no se pudo convertir", () => {
    const result = campaignResult({ hectares: 10, costs: [{ usd: null, ars: 5000 }], incomes: [], harvestedKg: 0, referencePrice: null });
    expect(result.unconverted).toBe(1);
  });
});

describe("harvestTotalKg", () => {
  it("entiende kg/ha, qq/ha y totales", () => {
    expect(harvestTotalKg(3200, "kg/ha", 100)).toBe(320_000);
    expect(harvestTotalKg(32, "qq/ha", 100)).toBe(320_000);
    expect(harvestTotalKg(320, "toneladas", null)).toBe(320_000);
    expect(harvestTotalKg(320_000, "kg", null)).toBe(320_000);
  });

  it("por hectárea sin superficie no se puede calcular", () => {
    expect(harvestTotalKg(3200, "kg/ha", null)).toBeNull();
  });
});
