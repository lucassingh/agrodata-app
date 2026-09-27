import { describe, expect, it } from "vitest";
import { mentionedField, routeMessage, switchTarget } from "./field-routing";

const fields = [
  { tenantId: "a", name: "Estancia La Esperanza" },
  { tenantId: "b", name: "El Retiro" },
  { tenantId: "c", name: "Tambo San José" },
];

describe("campo nombrado en el mensaje", () => {
  it("reconoce el nombre completo o sin las palabras genéricas", () => {
    expect(mentionedField("En La Esperanza sembramos 80 ha de soja", fields)?.tenantId).toBe("a");
    expect(mentionedField("esperanza: 200 litros de gasoil", fields)?.tenantId).toBe("a");
    expect(mentionedField("en el retiro nacieron 3 terneros", fields)?.tenantId).toBe("b");
    expect(mentionedField("Retiro, vacunamos 40 vacas", fields)?.tenantId).toBe("b");
    expect(mentionedField("en san jose ordeñamos 3200 litros", fields)?.tenantId).toBe("c");
  });

  it("no confunde palabras sueltas ni pedazos de palabras", () => {
    expect(mentionedField("compré 200 litros de gasoil", fields)).toBeNull();
    expect(mentionedField("retiramos los terneros del corral", fields)).toBeNull();
    // «el» solo no alcanza para nombrar El Retiro
    expect(mentionedField("el potrero norte", fields)).toBeNull();
  });

  it("dos campos con el mismo nombre es ambiguo", () => {
    expect(mentionedField("en la esperanza", [...fields, { tenantId: "d", name: "La Esperanza" }])).toBeNull();
  });
});

describe("cambio de campo", () => {
  it("entiende las formas habituales", () => {
    expect(switchTarget("Cambiá a El Retiro")).toBe("el retiro");
    expect(switchTarget("pasame al campo La Esperanza!")).toBe("la esperanza");
    expect(switchTarget("cambiar de campo")).toBeNull();
    expect(switchTarget("sembré soja en el norte")).toBeNull();
  });

  it("decide el campo: nombrado, cambio, último usado o preguntar", () => {
    expect(routeMessage("cambiá a El Retiro", fields, "a")).toEqual({ kind: "switch", field: fields[1] });
    expect(routeMessage("cambiá a La Aurora", fields, "a")).toEqual({ kind: "switch-unknown", target: "la aurora" });
    expect(routeMessage("en El Retiro compré 20 bolsas de maíz", fields, "a")).toEqual({ kind: "use", field: fields[1], named: true });
    expect(routeMessage("compré 20 bolsas de maíz", fields, "a")).toEqual({ kind: "use", field: fields[0], named: false });
    expect(routeMessage("compré 20 bolsas de maíz", fields, null)).toEqual({ kind: "ask" });
    expect(routeMessage("compré maíz", [fields[1]!], null)).toEqual({ kind: "use", field: fields[1], named: false });
  });
});
