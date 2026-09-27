import "server-only";
import { prisma } from "@repo/database";
import { getLivestockGroups } from "../livestock/weighings.service";
import { dateOnlyRangeFilter, dateRangeFilter } from "../reports/date-range";
import { visibleModules } from "../tenants/tenant-labels";
import { evaluateAlerts, type FieldAlert, type FieldAlertInput, type PendingTaskInput } from "./alert-rules";
import { alertSettingsSchema, resolveAlertSettings, type AlertSettings } from "./alert-settings";

const argentinaDay = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(date);

const addDays = (day: string, days: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Primer día del mes, `back` meses antes del de `day`. */
function monthStart(day: string, back: number): string {
  const date = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1 - back, 1));
  return date.toISOString().slice(0, 10);
}

const TASK_NAME: Record<string, string> = {
  ORDEN_SIEMBRA: "Siembra",
  PULVERIZACION: "Pulverización",
  FERTILIZACION: "Fertilización",
};

export async function getAlertSettings(tenantId: string): Promise<AlertSettings> {
  const row = await prisma.alertSettings.findUnique({ where: { tenantId } });
  return resolveAlertSettings(row?.settings ?? null);
}

export async function saveAlertSettings(tenantId: string, settings: AlertSettings) {
  const data = alertSettingsSchema.parse(settings);
  await prisma.alertSettings.upsert({ where: { tenantId }, create: { tenantId, settings: data }, update: { settings: data } });
}

/** Si esta persona recibe los avisos del campo por WhatsApp, y si tiene número cargado. */
export async function getMemberAlertPreference(userId: string, tenantId: string) {
  const membership = await prisma.userTenantMembership.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    select: { whatsappAlerts: true, user: { select: { wNumber: true } } },
  });
  return { whatsappAlerts: membership?.whatsappAlerts ?? false, hasWhatsapp: Boolean(membership?.user.wNumber) };
}

export async function setMemberWhatsappAlerts(userId: string, tenantId: string, enabled: boolean) {
  await prisma.userTenantMembership.update({
    where: { userId_tenantId: { userId, tenantId } },
    data: { whatsappAlerts: enabled },
  });
}

/** Todo lo que las reglas necesitan de un campo, en una lectura. Lo de ganadería
 *  y tambo solo si el campo tiene esas actividades. */
export async function gatherAlertInput(tenantId: string, today: string): Promise<FieldAlertInput> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { activities: true } });
  const modules = visibleModules(tenant.activities);

  const [supplies, consumption, tasks, groups, milk, expenses] = await Promise.all([
    prisma.supply.findMany({ where: { tenantId }, select: { id: true, name: true, unit: true, quantity: true, minStock: true } }),
    // Consumo real: salidas cargadas en el dashboard o por WhatsApp (sin ajustes de edición).
    prisma.stockMovement.groupBy({
      by: ["supplyId"],
      where: {
        tenantId,
        direction: "OUT",
        source: { in: ["MANUAL", "WHATSAPP"] },
        date: dateRangeFilter({ from: addDays(today, -29), to: today }),
      },
      _sum: { quantity: true },
    }),
    prisma.task.findMany({
      where: { tenantId, status: "PENDING" },
      include: { pastures: { include: { pasture: { select: { name: true } } } } },
    }),
    modules.livestock ? getLivestockGroups(tenantId) : Promise.resolve([]),
    modules.dairy
      ? prisma.milkRecord.findMany({ where: { tenantId, date: dateOnlyRangeFilter({ from: addDays(today, -13), to: today }) } })
      : Promise.resolve([]),
    prisma.expense.findMany({
      where: { tenantId, date: dateOnlyRangeFilter({ from: monthStart(today, 3), to: today }) },
      select: { categoryId: true, currency: true, amount: true, date: true, category: { select: { name: true } } },
    }),
  ]);

  const consumed = new Map(consumption.map((c) => [c.supplyId, c._sum.quantity ?? 0]));
  const toTask = (t: (typeof tasks)[number], name: string): PendingTaskInput => ({
    id: t.id,
    name,
    deadline: t.deadline.toISOString().slice(0, 10),
    pasture: t.pastures.map((p) => p.pasture.name).join(", ") || null,
  });

  return {
    today,
    supplies: supplies.map((s) => ({ ...s, consumedLast30: consumed.get(s.id) ?? 0 })),
    sanitaryTasks: tasks
      .filter((t) => t.type === "TRATAMIENTO_SANITARIO")
      .map((t) => toTask(t, t.treatment ?? t.description ?? "Tratamiento sanitario")),
    otherTasks: tasks
      .filter((t) => t.type !== "TRATAMIENTO_SANITARIO")
      .map((t) => toTask(t, t.type === "ORDEN_SIEMBRA" && t.crop ? `Siembra de ${t.crop.toLowerCase()}` : (TASK_NAME[t.type] ?? "Tarea"))),
    weighingGroups: groups.map((g) => ({ key: g.key, name: `${g.animalType} · ${g.pastureName}`, weighings: g.weighings })),
    milkDays: milk.map((m) => ({ day: m.date.toISOString().slice(0, 10), liters: m.liters, cowsMilking: m.cowsMilking })),
    monthlyExpenses: expenses.map((e) => ({
      categoryId: e.categoryId,
      category: e.category.name,
      currency: e.currency,
      month: e.date.toISOString().slice(0, 7),
      amount: e.amount,
    })),
  };
}

/** Los avisos de un campo hoy, de los más graves a los más leves. Se calculan en
 *  el momento: nunca se muestra uno viejo. */
export async function getFieldAlerts(tenantId: string, today = argentinaDay(new Date())): Promise<FieldAlert[]> {
  const [input, settings] = await Promise.all([gatherAlertInput(tenantId, today), getAlertSettings(tenantId)]);
  return evaluateAlerts(input, settings);
}
