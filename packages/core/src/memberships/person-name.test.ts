import { describe, expect, it } from "vitest";
import { splitFullName } from "./person-name";

describe("splitFullName", () => {
  it("la última palabra es el apellido", () => {
    expect(splitFullName("Juan Pérez")).toEqual({ name: "Juan", lastname: "Pérez" });
    expect(splitFullName("Juan Carlos Pérez")).toEqual({ name: "Juan Carlos", lastname: "Pérez" });
  });

  it("una sola palabra queda como nombre", () => {
    expect(splitFullName("  Ramón ")).toEqual({ name: "Ramón", lastname: "" });
  });

  it("vacío no es un nombre", () => {
    expect(splitFullName("")).toBeNull();
    expect(splitFullName("   ")).toBeNull();
  });
});
