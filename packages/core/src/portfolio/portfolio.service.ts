import "server-only";
import { prisma } from "@repo/database";
import { isWebRole, type FieldRole } from "../auth/field-roles";
import { seasonOf } from "../economy/economy-math";
import { getEconomyOverview } from "../economy/economy.service";
import { getDairyOverview } from "../livestock/dairy.service";
import { getLivestockGroups } from "../livestock/weighings.service";
import { dateOnlyRangeFilter } from "../reports/date-range";
import { visibleModules } from "../tenants/tenant-labels";
import { averageAdpv, seasonMarginPerHa } from "./portfolio-math";
import { getFieldAlerts } from "../alerts/alerts.service";

const argentinaDay = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(date);

function addDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export interface PortfolioField {
  tenantId: string;
  name: string;
  activities: string[];
  owner: string | null;
  myRole: FieldRole;
  /** Agricultura: margen del ciclo en curso. */
  season: string;
  agriculture: { campaigns: number; hectares: number; marginUsd: number; marginPerHaUsd: number | null } | null;
  /** Ganadería: ADPV promedio de los grupos con pesadas. */
  livestock: { adpv: number | null; groupsWithAdpv: number } | null;
  /** Tambo, últimos 30 días. */
  dairy: { litersPerCowDay: number | null; marginPerLiter: number | null; liters: number } | null;
  expensesMonth: { ars: number; usd: number };
  /** Avisos del campo (Etapa 5): cuántos, cuántos urgentes y el más grave. */
  alerts: { total: number; critical: number; top: string | null };
  lastEntryAt: Date | null;
}

async function fieldFigures(tenantId: string, today: string) {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { name: true, activities: true } });
  const modules = visibleModules(tenant.activities);
  const season = seasonOf(today);
  const monthStart = `${today.slice(0, 8)}01`;
  const expensesWhere = { tenantId, date: dateOnlyRangeFilter({ from: monthStart, to: today }) };
  const [owner, arsMonth, usdMonth, alerts, lastRecord, economy, groups, dairy] = await Promise.all([
    prisma.userTenantMembership.findFirst({
      where: { tenantId, role: "OWNER", status: "ACTIVE" },
      include: { user: { select: { name: true, lastname: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.expense.aggregate({ where: { ...expensesWhere, currency: "ARS" }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { ...expensesWhere, currency: "USD" }, _sum: { amount: true } }),
    getFieldAlerts(tenantId, today),
    prisma.record.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    modules.economy ? getEconomyOverview(tenantId, season) : null,
    modules.livestock ? getLivestockGroups(tenantId) : null,
    modules.dairy ? getDairyOverview(tenantId, { from: addDays(today, -29), to: today }) : null,
  ]);

  const agriculture = economy
    ? {
        campaigns: economy.campaigns.length,
        ...seasonMarginPerHa(economy.campaigns.map((c) => ({ hectares: c.hectares, marginUsd: c.result.marginUsd }))),
      }
    : null;
  const withAdpv = groups?.filter((g) => g.performance.adpv !== null) ?? [];

  return {
    name: tenant.name,
    activities: tenant.activities,
    owner: owner ? `${owner.user.name} ${owner.user.lastname}`.trim() : null,
    season,
    agriculture,
    livestock: groups
      ? {
          adpv: averageAdpv(withAdpv.map((g) => ({ adpv: g.performance.adpv, headCount: g.performance.headCount ?? g.currentHeads }))),
          groupsWithAdpv: withAdpv.length,
        }
      : null,
    dairy: dairy
      ? { litersPerCowDay: dairy.summary.litersPerCowDay, marginPerLiter: dairy.margin.marginPerLiter, liters: dairy.summary.liters }
      : null,
    expensesMonth: { ars: arsMonth._sum.amount ?? 0, usd: usdMonth._sum.amount ?? 0 },
    alerts: {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === "critical").length,
      top: alerts[0]?.title ?? null,
    },
    lastEntryAt: lastRecord?.createdAt ?? null,
  };
}

/** La cartera: los campos donde la persona entra a la web (dueño, encargado o
 *  asesor), con los números clave de cada uno según sus actividades. */
export async function getPortfolio(userId: string): Promise<PortfolioField[]> {
  const memberships = await prisma.userTenantMembership.findMany({
    where: { userId, status: "ACTIVE" },
    select: { tenantId: true, role: true },
  });
  const today = argentinaDay(new Date());
  const fields = await Promise.all(
    memberships
      .filter((m) => isWebRole(m.role))
      .map(async (m) => ({ tenantId: m.tenantId, myRole: m.role as FieldRole, ...(await fieldFigures(m.tenantId, today)) })),
  );
  return fields.sort((a, b) => a.name.localeCompare(b.name, "es"));
}
