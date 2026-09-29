import { describe, expect, it } from "vitest";
import { getTourSections } from "./get-tour-sections";
import type { TourDefinition } from "./types";

interface Ctx {
  isAdmin: boolean;
}

const definition: TourDefinition<Ctx> = {
  id: "demo",
  title: "Demo",
  intro: "prueba.",
  groupLabels: { a: "Sección A", b: "Sección B" },
  buildSteps: (ctx) => [
    { id: "a1", groupId: "a", target: "a1", body: "a1" },
    { id: "a2", groupId: "a", target: "a2", body: "a2" },
    ...(ctx.isAdmin ? [{ id: "b1", groupId: "b", target: "b1", body: "b1" }] : []),
  ],
};

describe("secciones del menú «Ver guía»", () => {
  it("una por grupo, sin repetir, en orden", () => {
    expect(getTourSections(definition, { isAdmin: true })).toEqual([
      { groupId: "a", label: "Sección A" },
      { groupId: "b", label: "Sección B" },
    ]);
  });

  it("respeta el filtro de buildSteps: un grupo que no aplica no aparece", () => {
    expect(getTourSections(definition, { isAdmin: false })).toEqual([{ groupId: "a", label: "Sección A" }]);
  });

  it("sin nombre para el grupo, usa su id", () => {
    expect(getTourSections({ ...definition, groupLabels: {} }, { isAdmin: false })).toEqual([{ groupId: "a", label: "a" }]);
  });
});
