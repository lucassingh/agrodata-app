import { describe, expect, it } from "vitest";
import { activitiesFromCategory, activitiesLabel, categoryFromActivities, visibleModules } from "./tenant-labels";

describe("actividades del campo", () => {
  it("los campos existentes pasan de rubro a actividades", () => {
    expect(activitiesFromCategory("FIELD_AGRICOLA")).toEqual(["AGRICULTURA"]);
    expect(activitiesFromCategory("GANADERO")).toEqual(["GANADERIA"]);
    expect(activitiesFromCategory("TAMBO")).toEqual(["TAMBO"]);
    expect(activitiesFromCategory("MIXTO")).toEqual(["AGRICULTURA", "GANADERIA", "TAMBO"]);
  });

  it("el rubro equivalente: una actividad, esa; varias, Mixto", () => {
    expect(categoryFromActivities(["AGRICULTURA"])).toBe("FIELD_AGRICOLA");
    expect(categoryFromActivities(["TAMBO"])).toBe("TAMBO");
    expect(categoryFromActivities(["AGRICULTURA", "TAMBO"])).toBe("MIXTO");
  });

  it("cada combinación muestra sus módulos; el tambo incluye Ganadería", () => {
    expect(visibleModules(["AGRICULTURA"])).toEqual({ economy: true, livestock: false, dairy: false });
    expect(visibleModules(["GANADERIA"])).toEqual({ economy: false, livestock: true, dairy: false });
    expect(visibleModules(["TAMBO"])).toEqual({ economy: false, livestock: true, dairy: true });
    expect(visibleModules(["AGRICULTURA", "TAMBO"])).toEqual({ economy: true, livestock: true, dairy: true });
    expect(visibleModules([])).toEqual({ economy: false, livestock: false, dairy: false });
  });

  it("las actividades en texto", () => {
    expect(activitiesLabel(["TAMBO", "AGRICULTURA"])).toBe("Agricultura y Tambo");
    expect(activitiesLabel(["AGRICULTURA", "GANADERIA", "TAMBO"])).toBe("Agricultura, Ganadería y Tambo");
    expect(activitiesLabel([])).toBe("Sin actividades");
  });
});
