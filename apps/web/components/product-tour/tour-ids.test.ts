import { describe, expect, it } from "vitest";
import { isTourId, tourIdForPath } from "./tour-ids";

describe("qué guía va en cada pantalla", () => {
  it("una por pantalla, también con barra final", () => {
    expect(tourIdForPath("/dashboard/summary")).toBe("resumen");
    expect(tourIdForPath("/dashboard/expenses/")).toBe("gastos");
    expect(tourIdForPath("/dashboard/how-start")).toBe("inicio");
  });

  it("las pantallas sin guía no tienen", () => {
    expect(tourIdForPath("/dashboard/plan")).toBeNull();
    expect(tourIdForPath("/dashboard/support")).toBeNull();
    expect(tourIdForPath("/dashboard/summary/otra")).toBeNull();
  });

  it("solo se aceptan ids conocidos", () => {
    expect(isTourId("gastos")).toBe(true);
    expect(isTourId("drop table")).toBe(false);
  });
});
