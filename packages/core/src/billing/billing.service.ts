import "server-only";
import { prisma, type PlanType, type SystemRole } from "@repo/database";
import { FIELD_ROLE_LABEL, isWebRole, type FieldRole } from "../auth/field-roles";
import { badRequest, forbidden } from "../errors";
import { sendEmail } from "../notifications/email.service";
import { coveredTenantIds, extendPaidUntil, isFieldCovered, planState, PLANS, type MembershipRef } from "./plans";

/** Solo el dueño y el asesor cubren un campo con su plan (ver PLANS). */
const COVERING_ROLES: SystemRole[] = ["OWNER", "ADVISOR"];
const DAY_MS = 86_400_000;

export const READ_ONLY_MESSAGE =
  "Este campo está en modo lectura: venció la prueba gratis o el plan. Podés ver y exportar todo; para volver a cargar datos, activá un plan.";

/** Lo que responde el bot cuando le mandan un dato a un campo en modo lectura. */
export const READ_ONLY_WHATSAPP_MESSAGE =
  "No cargué este dato: el campo está en modo lectura porque venció la prueba gratis o el plan. No se borró nada y podés seguir haciéndome preguntas. Para volver a cargar, quien administra el campo tiene que activar un plan desde la web, en Mi plan.";

const subscriptionSelect = { plan: true, trialEndsAt: true, paidUntil: true } as const;
const coveringMembershipsSelect = {
  where: { role: { in: COVERING_ROLES }, status: "ACTIVE" as const },
  select: { tenantId: true, role: true, createdAt: true },
};

const toRefs = (memberships: { tenantId: string; role: string; createdAt: Date }[]): MembershipRef[] =>
  memberships.map((m) => ({ tenantId: m.tenantId, role: m.role, joinedAt: m.createdAt }));

export type FieldAccess = "active" | "read-only";

/** Si el campo funciona o está en modo lectura: lo cubre el plan (o la prueba) de
 *  alguno de sus dueños o asesores. */
export async function getFieldAccess(tenantId: string, now = new Date()): Promise<FieldAccess> {
  const members = await prisma.user.findMany({
    where: { memberships: { some: { tenantId, role: { in: COVERING_ROLES }, status: "ACTIVE" } } },
    select: { subscription: { select: subscriptionSelect }, memberships: coveringMembershipsSelect },
  });
  const covered = isFieldCovered(
    tenantId,
    members.map((m) => ({ state: planState(m.subscription, now), memberships: toRefs(m.memberships) })),
  );
  return covered ? "active" : "read-only";
}

/** Para las acciones que cargan, editan o borran: en modo lectura se cortan. */
export async function assertFieldWritable(tenantId: string): Promise<void> {
  if ((await getFieldAccess(tenantId)) === "read-only") forbidden(READ_ONLY_MESSAGE);
}

// ── Mi plan ────────────────────────────────────────────────

export async function getMyPlan(userId: string, now = new Date()) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      subscription: { select: { ...subscriptionSelect, requestedPlan: true, requestedAt: true } },
      memberships: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: { tenantId: true, role: true, createdAt: true, tenant: { select: { name: true } } },
      },
    },
  });
  const state = planState(user.subscription, now);
  const mine = coveredTenantIds(state, toRefs(user.memberships));
  // Los campos donde soy operario se usan por WhatsApp: no van en la pantalla.
  const fields = await Promise.all(
    user.memberships.filter((m) => isWebRole(m.role)).map(async (m) => ({
      tenantId: m.tenantId,
      name: m.tenant.name,
      role: FIELD_ROLE_LABEL[m.role as FieldRole] ?? m.role,
      coveredByMe: mine.has(m.tenantId),
      access: mine.has(m.tenantId) ? ("active" as const) : await getFieldAccess(m.tenantId, now),
    })),
  );
  return {
    state,
    requestedPlan: user.subscription?.requestedPlan ?? null,
    requestedAt: user.subscription?.requestedAt ?? null,
    fields,
  };
}

/** La persona pide un plan desde la pantalla Plan: queda anotado y avisamos al
 *  equipo, que lo activa desde Soporte (hasta que esté Mercado Pago). */
export async function requestPlan(userId: string, plan: PlanType) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, lastname: true, email: true, wNumber: true, subscription: { select: { trialEndsAt: true } } },
  });
  const requestedAt = new Date();
  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, trialEndsAt: requestedAt, requestedPlan: plan, requestedAt },
    update: { requestedPlan: plan, requestedAt },
  });
  const to = process.env.DEMO_REQUESTS_EMAIL;
  if (!to) return;
  const price = PLANS[plan].monthlyUsd;
  await sendEmail({
    to,
    subject: `Pedido de plan ${PLANS[plan].name}: ${user.name} ${user.lastname}`.trim(),
    text: [
      `${user.name} ${user.lastname} pidió el plan ${PLANS[plan].name}${price ? ` (US$ ${price} por mes)` : ""}.`,
      `Email: ${user.email ?? "—"}`,
      `WhatsApp: ${user.wNumber ?? "—"}`,
      "",
      "Se activa desde el panel de Soporte, pestaña Cuentas.",
    ].join("\n"),
  }).catch((error) => console.error("[plan] no se pudo avisar por email", { userId, error }));
}

// ── Soporte (solo el equipo) ───────────────────────────────

/** Activa o renueva un plan: suma los meses desde hoy o desde el vencimiento
 *  vigente del mismo plan. Borra el pedido pendiente. */
export async function activatePlan(userId: string, plan: PlanType, months: number, now = new Date()) {
  if (!Number.isInteger(months) || months < 1 || months > 24) badRequest("Elegí entre 1 y 24 meses.");
  const current = await prisma.subscription.findUnique({ where: { userId }, select: { plan: true, paidUntil: true } });
  const paidUntil = extendPaidUntil(current, plan, months, now);
  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, trialEndsAt: now, plan, paidUntil },
    update: { plan, paidUntil, requestedPlan: null, requestedAt: null },
  });
}

/** Extiende la prueba `days` días desde hoy o desde su vencimiento, lo que sea más tarde. */
export async function extendTrial(userId: string, days: number, now = new Date()) {
  if (!Number.isInteger(days) || days < 1 || days > 90) badRequest("Elegí entre 1 y 90 días.");
  const current = await prisma.subscription.findUnique({ where: { userId }, select: { trialEndsAt: true } });
  const from = current && current.trialEndsAt > now ? current.trialEndsAt : now;
  const trialEndsAt = new Date(from.getTime() + days * DAY_MS);
  await prisma.subscription.upsert({ where: { userId }, create: { userId, trialEndsAt }, update: { trialEndsAt } });
}

/** Da de baja el plan pago (la prueba queda como estaba). Nunca borra datos. */
export async function cancelPlan(userId: string) {
  await prisma.subscription.updateMany({ where: { userId }, data: { plan: null, paidUntil: null } });
}

export async function setSubscriptionNote(userId: string, note: string) {
  const trimmed = note.trim().slice(0, 500) || null;
  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, trialEndsAt: new Date(), note: trimmed },
    update: { note: trimmed },
  });
}

/** Lo que muestra el encabezado del dashboard: si el campo activo está en modo
 *  lectura y cuántos días le quedan a mi prueba. */
export async function getShellPlanInfo(userId: string, activeTenantId: string | null, now = new Date()) {
  const [subscription, access] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId }, select: subscriptionSelect }),
    activeTenantId ? getFieldAccess(activeTenantId, now) : Promise.resolve<FieldAccess>("active"),
  ]);
  const state = planState(subscription, now);
  return { readOnly: access === "read-only", trialDaysLeft: state.kind === "trial" ? state.daysLeft : null };
}

/** Deja solo los campos que funcionan: los avisos y el resumen semanal no van a
 *  campos en modo lectura. */
export async function onlyActiveFields<T extends { tenantId: string }>(items: T[]): Promise<T[]> {
  const access = await Promise.all(items.map((item) => getFieldAccess(item.tenantId)));
  return items.filter((_, i) => access[i] === "active");
}
