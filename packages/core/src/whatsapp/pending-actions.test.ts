import { describe, expect, it } from "vitest";
import { canonicalUnit, unitsConflict } from "./units";
import { isPendingActionExpired, pendingActionSchema } from "./pending-actions";

const validAction = {
  actionType: "APPLY_MESSAGE_PLAN",
  payload: {
    recordId: "rec-1",
    event: {
      type: "PURCHASE",
      summary: "Compra de semillas",
      occurredAt: null,
      potrero: null,
      destinoPotrero: null,
      cultivo: null,
      hectareas: null,
      cantidad: 20,
      unidad: "bolsas",
      item: null,
      producto: "Semilla de maíz",
      movimientoStock: "INGRESO",
      monto: 1000,
      moneda: "ARS",
      contraparte: null,
      dosis: null,
      categoria: "Semillas",
    },
  },
};

describe("pendingActionSchema", () => {
  it("acepta una acción válida", () => {
    expect(pendingActionSchema.safeParse(validAction).success).toBe(true);
  });

  it("rechaza un tipo de acción desconocido (ej. de una versión vieja del código)", () => {
    expect(pendingActionSchema.safeParse({ ...validAction, actionType: "CREATE_EXPENSE_WITH_NEW_CATEGORY" }).success).toBe(
      false,
    );
  });

  it("rechaza un evento incompleto", () => {
    const { producto: _producto, ...event } = validAction.payload.event;
    expect(pendingActionSchema.safeParse({ ...validAction, payload: { ...validAction.payload, event } }).success).toBe(false);
  });
});

describe("isPendingActionExpired", () => {
  const now = new Date("2026-09-25T12:00:00Z");

  it("vigente antes del vencimiento, vencida después", () => {
    expect(isPendingActionExpired(new Date("2026-09-25T12:00:01Z"), now)).toBe(false);
    expect(isPendingActionExpired(new Date("2026-09-25T12:00:00Z"), now)).toBe(true);
  });
});

describe("unidades", () => {
  it("reconoce sinónimos", () => {
    expect(canonicalUnit("Litros")).toBe("l");
    expect(canonicalUnit("lts.")).toBe("l");
    expect(canonicalUnit("Kilos")).toBe("kg");
    expect(canonicalUnit("bolsas")).toBe("bolsa");
  });

  it("solo hay conflicto si las dos unidades existen y son distintas", () => {
    expect(unitsConflict("L", "litros")).toBe(false);
    expect(unitsConflict("kg", "bolsas")).toBe(true);
    expect(unitsConflict(null, "bolsas")).toBe(false);
  });
});
