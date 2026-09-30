import { describe, expect, it } from "vitest";
import { coveredTenantIds, extendPaidUntil, isFieldCovered, planState, type MembershipRef } from "./plans";

const NOW = new Date("2026-09-29T12:00:00Z");
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);
const m = (tenantId: string, role: string, joinedDaysAgo: number): MembershipRef => ({ tenantId, role, joinedAt: days(-joinedDaysAgo) });

describe("estado del plan", () => {
  it("prueba vigente, con los días que quedan redondeados para arriba", () => {
    expect(planState({ plan: null, trialEndsAt: days(3.2), paidUntil: null }, NOW)).toMatchObject({ kind: "trial", plan: "ASESOR", daysLeft: 4 });
  });

  it("un plan pago manda sobre la prueba; vencido todo, modo lectura", () => {
    expect(planState({ plan: "CAMPO", trialEndsAt: days(5), paidUntil: days(20) }, NOW)).toMatchObject({ kind: "paid", plan: "CAMPO" });
    expect(planState({ plan: "CAMPO", trialEndsAt: days(-30), paidUntil: days(-1) }, NOW)).toEqual({ kind: "expired" });
    expect(planState(null, NOW)).toEqual({ kind: "expired" });
  });

  it("con el pago vencido pero la prueba vigente, sigue la prueba", () => {
    expect(planState({ plan: "CAMPO", trialEndsAt: days(2), paidUntil: days(-1) }, NOW).kind).toBe("trial");
  });
});

describe("qué campos cubre cada plan", () => {
  const memberships = [m("propio-viejo", "OWNER", 90), m("propio-nuevo", "OWNER", 5), m("cliente", "ADVISOR", 30), m("empleo", "ADMIN", 60)];

  it("Campo: un solo campo propio, el más viejo", () => {
    const state = { kind: "paid" as const, plan: "CAMPO" as const, until: days(30) };
    expect([...coveredTenantIds(state, memberships)]).toEqual(["propio-viejo"]);
  });

  it("Asesor: propios y como asesor, hasta 10; nunca los de encargado", () => {
    const state = { kind: "paid" as const, plan: "ASESOR" as const, until: days(30) };
    expect([...coveredTenantIds(state, memberships)].sort()).toEqual(["cliente", "propio-nuevo", "propio-viejo"]);
    const many = Array.from({ length: 12 }, (_, i) => m(`c${i}`, "ADVISOR", 100 - i));
    expect(coveredTenantIds(state, many).size).toBe(10);
    expect(coveredTenantIds(state, many).has("c11")).toBe(false);
  });

  it("sin plan ni prueba no cubre nada", () => {
    expect(coveredTenantIds({ kind: "expired" }, memberships).size).toBe(0);
  });
});

describe("si un campo funciona", () => {
  it("alcanza con que lo cubra el plan del dueño o el de un asesor", () => {
    const expiredOwner = { state: { kind: "expired" as const }, memberships: [m("t", "OWNER", 10)] };
    const advisorWithPlan = { state: { kind: "paid" as const, plan: "ASESOR" as const, until: days(10) }, memberships: [m("t", "ADVISOR", 3)] };
    expect(isFieldCovered("t", [expiredOwner])).toBe(false);
    expect(isFieldCovered("t", [expiredOwner, advisorWithPlan])).toBe(true);
  });

  it("un encargado con plan no cubre un campo ajeno", () => {
    const manager = { state: { kind: "paid" as const, plan: "EMPRESA" as const, until: days(10) }, memberships: [m("t", "ADMIN", 3)] };
    expect(isFieldCovered("t", [manager])).toBe(false);
  });
});

describe("hasta cuándo queda pago", () => {
  it("renovar el mismo plan suma desde el vencimiento vigente", () => {
    const current = { plan: "ASESOR" as const, paidUntil: new Date("2026-10-15T12:00:00Z") };
    expect(extendPaidUntil(current, "ASESOR", 3, NOW).toISOString()).toBe("2027-01-15T12:00:00.000Z");
  });

  it("otro plan, un plan vencido o ninguno: desde hoy", () => {
    expect(extendPaidUntil({ plan: "CAMPO", paidUntil: new Date("2026-10-15T12:00:00Z") }, "ASESOR", 1, NOW).toISOString()).toBe("2026-10-29T12:00:00.000Z");
    expect(extendPaidUntil({ plan: "ASESOR", paidUntil: days(-3) }, "ASESOR", 12, NOW).toISOString()).toBe("2027-09-29T12:00:00.000Z");
    expect(extendPaidUntil(null, "CAMPO", 1, NOW).toISOString()).toBe("2026-10-29T12:00:00.000Z");
  });
});
