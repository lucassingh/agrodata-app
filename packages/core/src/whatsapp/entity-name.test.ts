import { describe, expect, it } from "vitest";
import { findByNormalizedName, normalizeEntityName } from "./entity-name";

describe("normalizeEntityName", () => {
  it("ignora mayúsculas, acentos y espacios de más", () => {
    expect(normalizeEntityName("  Combustíble   Diésel ")).toBe("combustible diesel");
  });

  it("devuelve vacío para un nombre en blanco", () => {
    expect(normalizeEntityName("   ")).toBe("");
  });
});

describe("findByNormalizedName", () => {
  const categories = [
    { id: "1", name: "Combustible" },
    { id: "2", name: "Sanidad animal" },
  ];

  it("encuentra por nombre normalizado", () => {
    expect(findByNormalizedName(categories, "COMBUSTIBLE")?.id).toBe("1");
    expect(findByNormalizedName(categories, "sanidad  ánimal")?.id).toBe("2");
  });

  it("no hace matching aproximado", () => {
    expect(findByNormalizedName(categories, "Combustibles")).toBeUndefined();
    expect(findByNormalizedName(categories, "Sanidad")).toBeUndefined();
  });

  it("no matchea un nombre vacío", () => {
    expect(findByNormalizedName([{ id: "x", name: "" }], "  ")).toBeUndefined();
  });
});
