import "server-only";
import { prisma, type DemoRequestStatus } from "@repo/database";
import { FIELD_ROLE_LABEL, isPlatformStaff, type FieldRole } from "../auth/field-roles";
import { forbidden } from "../errors";
import { lastWeeks, weeklyMetrics } from "./support-metrics";

/** El panel es solo para el equipo de AgroData (SUPER_ADMIN_EMAILS). */
export function assertPlatformStaff(email: string | null | undefined) {
  if (!isPlatformStaff(email)) forbidden("Solo el equipo de AgroData puede ver esto.");
}

const argentinaDay = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(date);

// ── Pedidos de demo ────────────────────────────────────────

export function listDemoRequests() {
  return prisma.demoRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
}

export async function updateDemoRequestStatus(id: string, status: DemoRequestStatus) {
  await prisma.demoRequest.update({ where: { id }, data: { status } });
}

// ── Cuentas ────────────────────────────────────────────────

/** Cada persona con sus campos (y su rol en cada uno) y su última carga. */
export async function listAccounts() {
  const [users, lastRecords] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        name: true,
        lastname: true,
        email: true,
        wNumber: true,
        profileType: true,
        createdAt: true,
        memberships: { where: { status: "ACTIVE" }, select: { role: true, tenant: { select: { name: true } } } },
      },
    }),
    prisma.record.groupBy({ by: ["userId"], where: { userId: { not: null } }, _max: { createdAt: true } }),
  ]);
  const lastByUser = new Map(lastRecords.map((r) => [r.userId, r._max.createdAt]));
  return users.map((u) => ({
    id: u.id,
    name: `${u.name} ${u.lastname}`.trim(),
    email: u.email,
    wNumber: u.wNumber,
    profileType: u.profileType,
    createdAt: u.createdAt,
    fields: u.memberships.map((m) => ({ name: m.tenant.name, role: FIELD_ROLE_LABEL[m.role as FieldRole] ?? m.role })),
    lastEntryAt: lastByUser.get(u.id) ?? null,
  }));
}

// ── Métricas ───────────────────────────────────────────────

export const METRIC_WEEKS = 8;

export async function getSupportMetrics(today = argentinaDay(new Date())) {
  const weeks = lastWeeks(today, METRIC_WEEKS);
  const since = new Date(`${weeks[0]}T00:00:00-03:00`);

  const [users, tenants, records, totals] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.tenant.findMany({
      where: { createdAt: { gte: since } },
      select: {
        createdAt: true,
        pastures: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } },
        records: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } },
      },
    }),
    prisma.record.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, tenantId: true, source: true, editedAt: true },
    }),
    Promise.all([prisma.user.count(), prisma.tenant.count(), prisma.demoRequest.count({ where: { status: "NEW" } })]),
  ]);

  const rows = weeklyMetrics({
    weeks,
    users: users.map((u) => ({ createdDay: argentinaDay(u.createdAt) })),
    fields: tenants.map((t) => ({
      createdDay: argentinaDay(t.createdAt),
      firstPastureDay: t.pastures[0] ? argentinaDay(t.pastures[0].createdAt) : null,
      firstRecordDay: t.records[0] ? argentinaDay(t.records[0].createdAt) : null,
    })),
    records: records.map((r) => ({
      createdDay: argentinaDay(r.createdAt),
      tenantId: r.tenantId,
      fromWhatsApp: r.source === "WHATSAPP",
      edited: r.editedAt !== null,
    })),
  });

  const [totalUsers, totalFields, newDemoRequests] = totals;
  return { rows, totals: { users: totalUsers, fields: totalFields, newDemoRequests } };
}
