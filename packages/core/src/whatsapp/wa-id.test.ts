import { describe, expect, it } from "vitest";
import { waIdFromWNumber, waMeDigits } from "./wa-id";

describe("waIdFromWNumber", () => {
  it("agrega el 9 de celular argentino (el formato del wa_id que manda Meta)", () => {
    expect(waIdFromWNumber("+543462565888")).toBe("5493462565888");
  });

  it("un número con otro formato no se convierte", () => {
    expect(waIdFromWNumber("3462565888")).toBeNull();
  });
});

describe("waMeDigits", () => {
  it("un celular argentino escrito de cualquier forma va con 549", () => {
    expect(waMeDigits("11 5555 1234")).toBe("5491155551234");
    expect(waMeDigits("011 5555-1234")).toBe("5491155551234");
    expect(waMeDigits("+54 11 5555 1234")).toBe("5491155551234");
    expect(waMeDigits("+54 9 11 5555 1234")).toBe("5491155551234");
  });

  it("lo que no reconoce queda con sus dígitos", () => {
    expect(waMeDigits("+1 (415) 555-0100 ext")).toBe("14155550100");
  });
});
