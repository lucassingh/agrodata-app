import { describe, expect, it } from "vitest";
import { dateRangeFilter } from "./date-range";

describe("dateRangeFilter", () => {
  it("sin rango no filtra", () => {
    expect(dateRangeFilter()).toBeUndefined();
    expect(dateRangeFilter({ from: "", to: "" })).toBeUndefined();
  });

  it("cubre los días completos en hora argentina", () => {
    const filter = dateRangeFilter({ from: "2026-09-01", to: "2026-09-30" });
    expect(filter?.gte?.toISOString()).toBe("2026-09-01T03:00:00.000Z");
    expect(filter?.lte?.toISOString()).toBe("2026-10-01T02:59:59.999Z");
  });

  it("acepta un solo extremo e ignora fechas mal formadas", () => {
    expect(dateRangeFilter({ from: "2026-09-01" })).toEqual({ gte: new Date("2026-09-01T03:00:00.000Z") });
    expect(dateRangeFilter({ from: "01/09/2026", to: "2026-09-30" })).toEqual({
      lte: new Date("2026-10-01T02:59:59.999Z"),
    });
  });
});
