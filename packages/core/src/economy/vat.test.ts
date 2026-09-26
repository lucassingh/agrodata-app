import { describe, expect, it } from "vitest";
import { costForCondition, netOfVat, suggestVatRate } from "./vat";

describe("suggestVatRate", () => {
  it("labores, maquinaria, fertilizantes y granos van al 10,5 %", () => {
    expect(suggestVatRate("Labores y servicios")).toBe(0.105);
    expect(suggestVatRate("Contratistas")).toBe(0.105);
    expect(suggestVatRate("Maquinaria")).toBe(0.105);
    expect(suggestVatRate("Fertilizantes", "Urea")).toBe(0.105);
  });

  it("agroquímicos, combustible y lo general van al 21 %", () => {
    expect(suggestVatRate("Fitosanitarios", "Glifosato")).toBe(0.21);
    expect(suggestVatRate("Combustible", "Gasoil")).toBe(0.21);
    expect(suggestVatRate("Varios")).toBe(0.21);
  });

  it("servicios públicos van al 27 %", () => {
    expect(suggestVatRate("Energía eléctrica")).toBe(0.27);
    expect(suggestVatRate("Luz y gas natural")).toBe(0.27);
  });
});

describe("netOfVat", () => {
  it("saca el IVA incluido", () => {
    expect(netOfVat(121_000, true, 0.21)).toBe(100_000);
    expect(netOfVat(110_500, true, 0.105)).toBe(100_000);
  });

  it("un importe sin IVA o exento queda igual", () => {
    expect(netOfVat(100_000, false, 0.21)).toBe(100_000);
    expect(netOfVat(100_000, true, 0)).toBe(100_000);
  });
});

describe("costForCondition", () => {
  it("responsable inscripto: el neto (recupera el IVA)", () => {
    expect(costForCondition(100_000, 0.21, "RESPONSABLE_INSCRIPTO")).toBe(100_000);
  });

  it("monotributista: el neto más el IVA (es costo)", () => {
    expect(costForCondition(100_000, 0.21, "MONOTRIBUTISTA")).toBe(121_000);
    expect(costForCondition(100_000, null, "MONOTRIBUTISTA")).toBe(100_000);
  });
});
