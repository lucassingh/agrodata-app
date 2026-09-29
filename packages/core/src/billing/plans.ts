/** Planes de AgroData (Etapa 6.3) y qué cubre cada uno. Una sola fuente para la
 *  landing, la pantalla Plan, el panel de soporte y el modo lectura. Puro: se
 *  testea sin base. */

export const PLAN_TYPES = ["CAMPO", "ASESOR", "EMPRESA"] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

/** Días de prueba gratis al registrarse, con todo el plan Asesor. */
export const TRIAL_DAYS = 14;
export const TRIAL_PLAN: PlanType = "ASESOR";

type CoveringRole = "OWNER" | "ADVISOR";

export const PLANS: Record<
  PlanType,
  { name: string; audience: string; monthlyUsd: number | null; maxFields: number; roles: CoveringRole[] }
> = {
  CAMPO: { name: "Campo", audience: "Para un establecimiento", monthlyUsd: 29, maxFields: 1, roles: ["OWNER"] },
  ASESOR: {
    name: "Asesor",
    audience: "Para agrónomos y veterinarios con cartera",
    monthlyUsd: 199,
    maxFields: 10,
    roles: ["OWNER", "ADVISOR"],
  },
  EMPRESA: { name: "Empresa", audience: "Para grupos y administradoras", monthlyUsd: null, maxFields: Infinity, roles: ["OWNER", "ADVISOR"] },
};

export interface SubscriptionData {
  plan: PlanType | null;
  trialEndsAt: Date;
  /** Hasta cuándo está pago el plan (null si nunca se pagó). */
  paidUntil: Date | null;
}

export type PlanState =
  | { kind: "paid"; plan: PlanType; until: Date }
  | { kind: "trial"; plan: PlanType; until: Date; daysLeft: number }
  | { kind: "expired" };

const DAY_MS = 86_400_000;

/** En qué está una persona hoy. Un plan pago manda sobre la prueba. */
export function planState(subscription: SubscriptionData | null, now: Date): PlanState {
  if (!subscription) return { kind: "expired" };
  if (subscription.plan && subscription.paidUntil && subscription.paidUntil > now) {
    return { kind: "paid", plan: subscription.plan, until: subscription.paidUntil };
  }
  if (subscription.trialEndsAt > now) {
    const daysLeft = Math.ceil((subscription.trialEndsAt.getTime() - now.getTime()) / DAY_MS);
    return { kind: "trial", plan: TRIAL_PLAN, until: subscription.trialEndsAt, daysLeft };
  }
  return { kind: "expired" };
}

export interface MembershipRef {
  tenantId: string;
  role: string;
  /** Para decidir cuáles entran cuando hay más campos que el tope: los más viejos primero. */
  joinedAt: Date;
}

/** Los campos que cubre el plan de una persona: los de los roles del plan, del
 *  más viejo al más nuevo, hasta el tope. Sin plan ni prueba, ninguno. */
export function coveredTenantIds(state: PlanState, memberships: MembershipRef[]): Set<string> {
  if (state.kind === "expired") return new Set();
  const plan = PLANS[state.plan];
  const eligible = memberships
    .filter((m) => (plan.roles as string[]).includes(m.role))
    .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  return new Set(eligible.slice(0, plan.maxFields).map((m) => m.tenantId));
}

/** Un campo funciona si lo cubre el plan (o la prueba) de alguno de sus miembros. */
export function isFieldCovered(
  tenantId: string,
  members: { state: PlanState; memberships: MembershipRef[] }[],
): boolean {
  return members.some((m) => coveredTenantIds(m.state, m.memberships).has(tenantId));
}
