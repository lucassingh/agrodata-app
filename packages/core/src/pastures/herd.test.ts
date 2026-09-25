import { describe, expect, it } from "vitest";
import { herdDiff, restDays } from "./herd";

describe("herdDiff", () => {
  it("devuelve solo lo que cambió, por tipo", () => {
    expect(
      herdDiff(
        [
          { animalType: "Novillos", quantity: 40 },
          { animalType: "Vacas", quantity: 10 },
        ],
        [
          { animalType: "novillos", quantity: 35 },
          { animalType: "Vacas", quantity: 10 },
          { animalType: "Terneros", quantity: 8 },
        ],
      ),
    ).toEqual([
      { animalType: "novillos", delta: -5 },
      { animalType: "Terneros", delta: 8 },
    ]);
  });

  it("vaciar el potrero saca todo", () => {
    expect(herdDiff([{ animalType: "Vacas", quantity: 10 }], [])).toEqual([{ animalType: "Vacas", delta: -10 }]);
  });
});

describe("restDays", () => {
  const now = new Date("2026-09-27T12:00:00Z");

  it("cuenta los días desde la última salida si está vacío", () => {
    expect(restDays(0, new Date("2026-09-15T12:00:00Z"), now)).toBe(12);
  });

  it("un potrero ocupado no está descansando", () => {
    expect(restDays(20, new Date("2026-09-15T12:00:00Z"), now)).toBeNull();
  });

  it("sin salidas registradas no se sabe", () => {
    expect(restDays(0, null, now)).toBeNull();
  });
});
