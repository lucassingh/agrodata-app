import { describe, expect, it } from "vitest";
import { isPendingActionExpired, pendingActionSchema } from "./pending-actions";

const validAction = {
  actionType: "CREATE_EXPENSE_WITH_NEW_CATEGORY",
  payload: {
    categoryName: "Combustible",
    expense: {
      type: "FUEL_USAGE",
      summary: "Carga de gasoil",
      occurredAt: null,
      monto: 1000,
      moneda: "ARS",
      contraparte: null,
      categoria: "Combustible",
    },
  },
};

describe("pendingActionSchema", () => {
  it("acepta una acción válida", () => {
    expect(pendingActionSchema.safeParse(validAction).success).toBe(true);
  });

  it("rechaza un tipo de acción desconocido", () => {
    expect(pendingActionSchema.safeParse({ ...validAction, actionType: "BORRAR_TODO" }).success).toBe(false);
  });

  it("rechaza un payload incompleto (ej. de una versión vieja del código)", () => {
    const { expense: _expense, ...payload } = validAction.payload;
    expect(pendingActionSchema.safeParse({ ...validAction, payload }).success).toBe(false);
  });

  it("rechaza una categoría en blanco", () => {
    const payload = { ...validAction.payload, categoryName: "   " };
    expect(pendingActionSchema.safeParse({ ...validAction, payload }).success).toBe(false);
  });
});

describe("isPendingActionExpired", () => {
  const now = new Date("2026-09-25T12:00:00Z");

  it("vigente antes del vencimiento, vencida después", () => {
    expect(isPendingActionExpired(new Date("2026-09-25T12:00:01Z"), now)).toBe(false);
    expect(isPendingActionExpired(new Date("2026-09-25T12:00:00Z"), now)).toBe(true);
  });
});
