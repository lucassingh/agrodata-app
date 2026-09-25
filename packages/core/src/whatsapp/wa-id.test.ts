import { describe, expect, it } from "vitest";
import { waIdFromWNumber } from "./wa-id";

describe("waIdFromWNumber", () => {
  it("agrega el 9 de celular argentino (el formato del wa_id que manda Meta)", () => {
    expect(waIdFromWNumber("+543462565888")).toBe("5493462565888");
  });

  it("un número con otro formato no se convierte", () => {
    expect(waIdFromWNumber("3462565888")).toBeNull();
  });
});
