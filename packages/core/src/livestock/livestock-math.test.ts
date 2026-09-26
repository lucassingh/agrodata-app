import { describe, expect, it } from "vitest";
import {
  adpv,
  aggregateWeighingRows,
  feedMargin,
  groupPerformance,
  isFeedSupply,
  serviceSeasonLabel,
  serviceYearOf,
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
  const ev = (over: Partial<Parameters<typeof reproIndices>[0][number]>) => ({
    type: "SERVICE_START" as const,
    day: "2025-11-01",
    rodeo: null,
    females: null,
    pregnant: null,
    empty: null,
    weaned: null,
    ...over,
  });

  it("preñez del tacto, parición y destete sobre las vacas en servicio", () => {
    const result = reproIndices(
      [
        ev({ type: "SERVICE_START", females: 100 }),
        ev({ type: "PREGNANCY_CHECK", day: "2026-02-15", pregnant: 85, empty: 15 }),
        ev({ type: "WEANING", day: "2027-03-10", weaned: 70 }),
      ],
      80,
    );
    expect(result).toMatchObject({ females: 100, pregnancyPct: 85, calvingPct: 80, weaningPct: 70 });
  });

  it("suma los rodeos y usa el último tacto de cada uno", () => {
    const result = reproIndices(
      [
        ev({ rodeo: "Cría", type: "PREGNANCY_CHECK", day: "2026-02-01", pregnant: 40, empty: 20 }),
        ev({ rodeo: "Cría", type: "PREGNANCY_CHECK", day: "2026-03-01", pregnant: 50, empty: 10 }),
        ev({ rodeo: "Vaquillonas", type: "PREGNANCY_CHECK", day: "2026-03-01", pregnant: 30, empty: 10 }),
      ],
      0,
    );
    expect(result).toMatchObject({ females: 100, pregnant: 80, empty: 20, pregnancyPct: 80, calvingPct: null });
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

describe("serviceYearOf", () => {
  it("ubica todo el ciclo de un servicio de primavera 2025 en la temporada 2025/26", () => {
    expect(serviceYearOf("SERVICE_START", "2025-11-01")).toBe(2025);
    expect(serviceYearOf("SERVICE_START", "2026-01-10")).toBe(2025);
    expect(serviceYearOf("PREGNANCY_CHECK", "2026-02-20")).toBe(2025);
    expect(serviceYearOf("CALVING", "2026-08-15")).toBe(2025);
    expect(serviceYearOf("WEANING", "2027-03-10")).toBe(2025);
    expect(serviceSeasonLabel(2025)).toBe("2025/26");
  });

  it("un destete precoz de fin de año va al servicio del año anterior", () => {
    expect(serviceYearOf("WEANING", "2026-12-05")).toBe(2025);
  });
});
