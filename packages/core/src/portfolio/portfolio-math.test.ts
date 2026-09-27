import { describe, expect, it } from "vitest";
import { averageAdpv, ranking, seasonMarginPerHa } from "./portfolio-math";

describe("cartera", () => {
  it("margen por ha ponderado por superficie; sin hectáreas no hay margen por ha", () => {
    expect(
      seasonMarginPerHa([
        { hectares: 80, marginUsd: 40_000 },
        { hectares: 20, marginUsd: -2_000 },
        { hectares: null, marginUsd: 999 },
      ]),
    ).toEqual({ marginUsd: 38_000, hectares: 100, marginPerHaUsd: 380 });
    expect(seasonMarginPerHa([]).marginPerHaUsd).toBeNull();
  });

  it("ADPV promedio ponderado por cabezas; ignora grupos sin ADPV", () => {
    expect(
      averageAdpv([
        { adpv: 1, headCount: 30 },
        { adpv: 0.5, headCount: 10 },
        { adpv: null, headCount: 100 },
      ]),
    ).toBe(0.88);
    expect(averageAdpv([{ adpv: 0.7, headCount: null }])).toBe(0.7);
    expect(averageAdpv([{ adpv: null, headCount: 5 }])).toBeNull();
  });

  it("el comparativo deja afuera los campos sin dato y ordena de mayor a menor", () => {
    expect(
      ranking([
        { tenantId: "a", name: "A", value: 100 },
        { tenantId: "b", name: "B", value: null },
        { tenantId: "c", name: "C", value: 250 },
      ]).map((r) => r.name),
    ).toEqual(["C", "A"]);
  });
});
