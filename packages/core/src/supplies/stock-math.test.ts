import { describe, expect, it } from "vitest";
import { nextStock, unitCostOf } from "./stock-math";

describe("nextStock", () => {
  it("un ingreso suma todo", () => {
    expect(nextStock(10, "in", 5)).toEqual({ balance: 15, moved: 5 });
  });

  it("un consumo resta", () => {
    expect(nextStock(10, "out", 4)).toEqual({ balance: 6, moved: 4 });
  });

  it("un consumo mayor al stock queda en 0 y registra solo lo que había", () => {
    expect(nextStock(10, "out", 25)).toEqual({ balance: 0, moved: 10 });
  });
});

describe("unitCostOf", () => {
  it("divide el monto por la cantidad", () => {
    expect(unitCostOf(250000, 500)).toBe(500);
  });

  it("sin monto no hay costo", () => {
    expect(unitCostOf(null, 500)).toBeNull();
    expect(unitCostOf(0, 500)).toBeNull();
  });
});
