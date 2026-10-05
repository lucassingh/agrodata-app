import "server-only";
import { z } from "zod";
import { prisma } from "@repo/database";
import { badRequest, forbidden } from "../errors";
import { FIELD_ROLE_LABEL, isPlatformStaff, isWebRole, type FieldRole } from "../auth/field-roles";
import { getEconomyOverview } from "../economy/economy.service";
import { getDairyOverview } from "../livestock/dairy.service";
import { getLivestockGroups } from "../livestock/weighings.service";
import { LOW_STOCK_THRESHOLD } from "../supplies/stock-math";
import { activitiesLabel, visibleModules } from "../tenants/tenant-labels";
import { dateOnlyRangeFilter, dateRangeFilter } from "./date-range";
import type { ReportPeriod } from "./report-period";
import { detectLogoType, logoProblem } from "./report-logo";

export const signatureSchema = z.object({
  profession: z.string().trim().max(80, "Hasta 80 caracteres"),
  licenseNumber: z.string().trim().max(40, "Hasta 40 caracteres"),
});
export type SignatureInput = z.infer<typeof signatureSchema>;

/** Guarda la firma de los informes en el perfil. Vacío = sin ese dato. */
export async function updateSignature(userId: string, input: SignatureInput) {
  await prisma.user.update({
    where: { id: userId },
    data: { profession: input.profession || null, licenseNumber: input.licenseNumber || null },
  });
}

export async function getSignature(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, lastname: true, profession: true, licenseNumber: true, reportLogo: { select: { updatedAt: true } } },
  });
  return {
    fullName: `${user.name} ${user.lastname}`.trim(),
    profession: user.profession,
    licenseNumber: user.licenseNumber,
    /** Cambia cada vez que se sube un logo (para no ver uno viejo en caché). Null: sin logo. */
    logoVersion: user.reportLogo ? String(user.reportLogo.updatedAt.getTime()) : null,
  };
}

/** Guarda o reemplaza el logo de los informes. */
export async function saveReportLogo(userId: string, bytes: Uint8Array) {
  const problem = logoProblem(bytes);
  if (problem) badRequest(problem);
  const mimeType = detectLogoType(bytes)!;
  const data = Buffer.from(bytes);
  await prisma.userReportLogo.upsert({ where: { userId }, create: { userId, data, mimeType }, update: { data, mimeType } });
}

export async function removeReportLogo(userId: string) {
  await prisma.userReportLogo.deleteMany({ where: { userId } });
}

export async function getReportLogo(userId: string) {
  return prisma.userReportLogo.findUnique({ where: { userId }, select: { data: true, mimeType: true } });
}

/** Todo lo que lleva el informe de un campo para un período, según sus
 *  actividades. Lo puede pedir quien entra a la web en ese campo. */
export async function getFieldReport(
  actor: { userId: string; email: string | null },
  tenantId: string,
  period: ReportPeriod,
) {
  const membership = await prisma.userTenantMembership.findFirst({ where: { userId: actor.userId, tenantId, status: "ACTIVE" } });
  if (!isPlatformStaff(actor.email) && (!membership || !isWebRole(membership.role))) {
    forbidden("No tenés acceso a este campo.");
  }

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { name: true, activities: true, location: true, totalHa: true, vatCondition: true },
  });
  const modules = visibleModules(tenant.activities);
  const expenseWhere = { tenantId, date: dateOnlyRangeFilter(period) };
  const dueUntil = new Date(`${period.to}T23:59:59.999Z`);
  dueUntil.setUTCDate(dueUntil.getUTCDate() + 30);

  const [owner, expensesByCategory, categories, records, lowStock, sanitaryDue, tasksDone, economy, groups, dairy, signature] =
    await Promise.all([
      prisma.userTenantMembership.findFirst({
        where: { tenantId, role: "OWNER", status: "ACTIVE" },
        include: { user: { select: { name: true, lastname: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.expense.groupBy({ by: ["categoryId", "currency"], where: expenseWhere, _sum: { amount: true }, _count: true }),
      prisma.expenseCategory.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      prisma.record.count({ where: { tenantId, createdAt: dateRangeFilter(period) } }),
      prisma.supply.findMany({ where: { tenantId, quantity: { lte: LOW_STOCK_THRESHOLD } }, orderBy: { name: "asc" }, take: 10 }),
      prisma.task.findMany({
        where: { tenantId, type: "TRATAMIENTO_SANITARIO", status: "PENDING", deadline: { lte: dueUntil } },
        orderBy: { deadline: "asc" },
        take: 10,
      }),
      prisma.task.count({ where: { tenantId, status: "COMPLETED", updatedAt: dateRangeFilter(period) } }),
      modules.economy ? getEconomyOverview(tenantId, period.season) : null,
      modules.livestock ? getLivestockGroups(tenantId) : null,
      modules.dairy ? getDairyOverview(tenantId, { from: period.from, to: period.to }) : null,
      getSignature(actor.userId),
    ]);

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const expenses = expensesByCategory
    .map((e) => ({
      category: categoryName.get(e.categoryId) ?? "Sin categoría",
      currency: e.currency,
      amount: e._sum.amount ?? 0,
      count: e._count,
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency) || b.amount - a.amount);
  const total = (currency: "ARS" | "USD") =>
    expenses.filter((e) => e.currency === currency).reduce((sum, e) => sum + e.amount, 0);

  return {
    field: {
      name: tenant.name,
      activities: activitiesLabel(tenant.activities),
      location: tenant.location,
      totalHa: tenant.totalHa,
      owner: owner ? `${owner.user.name} ${owner.user.lastname}`.trim() : null,
      vatCondition: tenant.vatCondition,
    },
    author: {
      ...signature,
      role: membership ? FIELD_ROLE_LABEL[membership.role as FieldRole] : "Soporte",
    },
    period,
    activity: { records, tasksDone },
    expenses: { rows: expenses, totalArs: total("ARS"), totalUsd: total("USD") },
    economy: economy
      ? {
          rateLabel: economy.rateLabel,
          campaigns: economy.campaigns.map((c) => ({
            name: `${c.crop} · ${c.pastureName}`,
            status: c.status,
            hectares: c.hectares,
            costPerHaUsd: c.result.costPerHaUsd,
            yieldKgHa: c.result.yieldKgHa,
            marginUsd: c.result.marginUsd,
            marginPerHaUsd: c.result.marginPerHaUsd,
          })),
        }
      : null,
    livestock: groups
      ? groups
          .filter((g) => g.performance.lastDay !== null)
          .map((g) => ({
            name: `${g.animalType} · ${g.pastureName}`,
            lastDay: g.performance.lastDay,
            headCount: g.performance.headCount,
            averageKg: g.performance.lastAverageKg,
            adpv: g.performance.adpv,
            liveKgPerHa: g.performance.liveKgPerHa,
          }))
      : null,
    dairy: dairy
      ? {
          liters: dairy.summary.liters,
          days: dairy.summary.days,
          litersPerCowDay: dairy.summary.litersPerCowDay,
          incomePerLiter: dairy.margin.incomePerLiter,
          priceIsReference: dairy.priceIsReference,
          feedCostPerLiter: dairy.margin.feedCostPerLiter,
          marginPerLiter: dairy.margin.marginPerLiter,
        }
      : null,
    lowStock: lowStock.map((s) => ({ name: s.name, quantity: s.quantity, unit: s.unit })),
    sanitaryDue: sanitaryDue.map((t) => ({
      title: t.treatment ?? t.description ?? "Tratamiento sanitario",
      deadline: t.deadline.toISOString().slice(0, 10),
    })),
  };
}

export type FieldReport = Awaited<ReturnType<typeof getFieldReport>>;
