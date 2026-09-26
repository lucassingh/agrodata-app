import { describe, expect, it } from "vitest";
import {
  adpv,
  aggregateWeighingRows,
  feedMargin,
  groupPerformance,
  isFeedSupply,
  litersPerCow,
  milkSummary,
  reproIndices,
  settlementPricePerLiter,
} from "./livestock-math";

describe("adpv", () => {
  it("kilos ganados por día entre dos pesadas", () => {
    expect(adpv({ day: "2026-08-01", headCount: 40, averageKg: 180 }, { day: "2026-09-01", headCount: 40, averageKg: 205 })).toBe(0.806);
  });

  it("dos pesadas el mismo día no dan ADPV", () => {
    expect(adpv({ day: "2026-09-01", headCount: 40, averageKg: 180 }, { day: "2026-09-01", headCount: 40, averageKg: 181 })).toBeNull();
  });
});

describe("groupPerformance", () => {
  const weighings = [
    { day: "2026-09-01", headCount: 40, averageKg: 205 },
    { day: "2026-08-01", headCount: 40, averageKg: 180 },
  ];

  it("ADPV, kg producidos, carga y cabezas por hectárea", () => {
    expect(groupPerformance(weighings, 20)).toEqual({
      lastDay: "2026-09-01",
      lastAverageKg: 205,
      headCount: 40,
      adpv: 0.806,
      periodDays: 31,
      kgProducedPerHa: 50,
      liveKgPerHa: 410,
      headsPerHa: 2,
    });
  });

  it("con una sola pesada hay carga pero no ADPV", () => {
    const result = groupPerformance([weighings[0]!], 20);
    expect(result.adpv).toBeNull();
    expect(result.liveKgPerHa).toBe(410);
  });

  it("sin hectáreas no hay valores por hectárea", () => {
    expect(groupPerformance(weighings, null)).toMatchObject({ adpv: 0.806, liveKgPerHa: null, kgProducedPerHa: null });
  });
});

describe("reproIndices", () => {
  it("preñez del tacto, parición y destete sobre las vacas en servicio", () => {
    const result = reproIndices([
      { type: "SERVICE_START", day: "2025-11-01", females: 100, pregnant: null, empty: null, births: null, weaned: null },
      { type: "PREGNANCY_CHECK", day: "2026-02-15", females: null, pregnant: 85, empty: 15, births: null, weaned: null },
      { type: "CALVING", day: "2026-08-10", females: null, pregnant: null, empty: null, births: 50, weaned: null },
      { type: "CALVING", day: "2026-08-25", females: null, pregnant: null, empty: null, births: 30, weaned: null },
    ]);
    expect(result).toMatchObject({ females: 100, pregnancyPct: 85, calvingPct: 80, weaningPct: null, births: 80 });
  });

  it("sin inicio de servicio, las vacas son las del tacto", () => {
    const result = reproIndices([
      { type: "PREGNANCY_CHECK", day: "2026-02-15", females: null, pregnant: 45, empty: 5, births: null, weaned: null },
    ]);
    expect(result).toMatchObject({ females: 50, pregnancyPct: 90 });
  });
});

describe("tambo", () => {
  it("litros por vaca en ordeño", () => {
    expect(litersPerCow({ day: "2026-09-25", liters: 3200, cowsMilking: 140 })).toBe(22.9);
    expect(litersPerCow({ day: "2026-09-25", liters: 3200, cowsMilking: null })).toBeNull();
  });

  it("resumen del período: L/vaca/día solo con los días que tienen vacas", () => {
    expect(
      milkSummary([
        { day: "2026-09-24", liters: 3000, cowsMilking: 150 },
        { day: "2026-09-25", liters: 3200, cowsMilking: 160 },
        { day: "2026-09-26", liters: 3100, cowsMilking: null },
      ]),
    ).toEqual({ days: 3, liters: 9300, litersPerDay: 3100, litersPerCowDay: 20 });
  });

  it("margen sobre alimentación por litro", () => {
    expect(feedMargin({ incomePerLiter: 420, feedCost: 2_100_000, liters: 10_000 })).toEqual({
      incomePerLiter: 420,
      feedCostPerLiter: 210,
      marginPerLiter: 210,
      marginTotal: 2_100_000,
    });
  });

  it("precio por litro de la liquidación: el informado o total ÷ litros", () => {
    expect(settlementPricePerLiter({ pricePerLiter: 415.5, totalAmount: 0, liters: 1 })).toBe(415.5);
    expect(settlementPricePerLiter({ pricePerLiter: null, totalAmount: 4_200_000, liters: 10_000 })).toBe(420);
  });
});

describe("aggregateWeighingRows", () => {
  it("una fila por animal se promedia por potrero, categoría y fecha", () => {
    const result = aggregateWeighingRows([
      { pasture: "Corral 1", animalType: "Terneros", day: "2026-09-20", kg: 180, headCount: null },
      { pasture: "corral 1 ", animalType: "terneros", day: "2026-09-20", kg: 200, headCount: null },
      { pasture: "Corral 2", animalType: "Terneros", day: "2026-09-20", kg: 150, headCount: null },
    ]);
    expect(result).toEqual([
      { pasture: "Corral 1", animalType: "Terneros", day: "2026-09-20", headCount: 2, averageKg: 190 },
      { pasture: "Corral 2", animalType: "Terneros", day: "2026-09-20", headCount: 1, averageKg: 150 },
    ]);
  });

  it("filas de grupo se ponderan por cabezas", () => {
    const result = aggregateWeighingRows([
      { pasture: "Norte", animalType: "Novillos", day: "2026-09-20", kg: 300, headCount: 30 },
      { pasture: "Norte", animalType: "Novillos", day: "2026-09-20", kg: 320, headCount: 10 },
    ]);
    expect(result).toEqual([{ pasture: "Norte", animalType: "Novillos", day: "2026-09-20", headCount: 40, averageKg: 305 }]);
  });
});

describe("isFeedSupply", () => {
  it("reconoce la alimentación por categoría o por nombre", () => {
    expect(isFeedSupply({ categoryCode: "ALIMENTO", categoryName: "Otros", supplyName: "X" })).toBe(true);
    expect(isFeedSupply({ categoryCode: null, categoryName: "Alimentación", supplyName: "Balanceado 18%" })).toBe(true);
    expect(isFeedSupply({ categoryCode: null, categoryName: "Varios", supplyName: "Silo de maíz" })).toBe(true);
    expect(isFeedSupply({ categoryCode: null, categoryName: "Combustible", supplyName: "Gasoil" })).toBe(false);
  });
});
