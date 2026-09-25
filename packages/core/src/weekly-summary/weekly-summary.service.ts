import "server-only";
import { prisma } from "@repo/database";
import { dateOnlyRangeFilter, dateRangeFilter } from "../reports/date-range";
import { LOW_STOCK_THRESHOLD } from "../supplies/stock-math";
import { waIdFromWNumber } from "../whatsapp/wa-id";
import { OUTSIDE_24H_WINDOW, sendWhatsAppTemplate, sendWhatsAppText, WhatsAppSendError } from "../whatsapp/whatsapp-client";
import { weeklySummaryOneLine, weeklySummaryText, type WeeklySummaryData } from "./weekly-summary";

type Currency = "ARS" | "USD";

export interface WeeklySummaryTarget {
  tenantId: string;
  fieldName: string;
  recipients: { userId: string; name: string; waId: string }[];
}

/** A quién le llega el resumen: quienes administran cada campo (Farm Manager u
 *  Owner, con membresía activa) y tienen WhatsApp cargado. Los Operators no. */
export async function weeklySummaryTargets(): Promise<WeeklySummaryTarget[]> {
  const memberships = await prisma.userTenantMembership.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ role: "ADMIN" }, { user: { isSuperAdmin: true } }],
      user: { wNumber: { not: null } },
    },
    include: {
      user: { select: { id: true, name: true, wNumber: true } },
      tenant: { select: { id: true, name: true } },
    },
  });

  const targets = new Map<string, WeeklySummaryTarget>();
  for (const membership of memberships) {
    const waId = membership.user.wNumber ? waIdFromWNumber(membership.user.wNumber) : null;
    if (!waId) continue;
    const target = targets.get(membership.tenantId) ?? {
      tenantId: membership.tenantId,
      fieldName: membership.tenant.name,
      recipients: [],
    };
    target.recipients.push({ userId: membership.user.id, name: membership.user.name, waId });
    targets.set(membership.tenantId, target);
  }
  return [...targets.values()];
}

/** Números de la semana de un campo. Días argentinos para lo que ocurre en un
 *  momento; días UTC para los campos de solo fecha (gastos, vencimientos). */
export async function gatherWeeklySummary(
  tenantId: string,
  fieldName: string,
  period: { from: string; to: string },
): Promise<WeeklySummaryData> {
  const moment = dateRangeFilter(period);
  const dateOnly = dateOnlyRangeFilter(period);

  const [expenses, consumptions, livestock, tasks, records, fromWhatsApp, lowStock] = await Promise.all([
    prisma.expense.findMany({ where: { tenantId, date: dateOnly }, include: { category: { select: { name: true } } } }),
    prisma.stockMovement.findMany({
      where: { tenantId, direction: "OUT", source: { not: "INITIAL" }, date: moment },
      include: { supply: { select: { name: true, unit: true } } },
    }),
    prisma.livestockEvent.findMany({ where: { tenantId, date: moment, type: { in: ["BIRTH", "PURCHASE", "SALE", "DEATH"] } } }),
    prisma.task.groupBy({ by: ["status"], where: { tenantId, deadline: dateOnly }, _count: true }),
    prisma.record.count({ where: { tenantId, occurredAt: moment } }),
    prisma.record.count({ where: { tenantId, occurredAt: moment, source: "WHATSAPP" } }),
    prisma.supply.findMany({ where: { tenantId, quantity: { lte: LOW_STOCK_THRESHOLD } }, orderBy: { quantity: "asc" }, take: 5 }),
  ]);

  const byCurrency: Partial<Record<Currency, number>> = {};
  const byCategory = new Map<string, { name: string; amount: number; currency: Currency }>();
  for (const expense of expenses) {
    byCurrency[expense.currency] = (byCurrency[expense.currency] ?? 0) + expense.amount;
    const key = `${expense.category.name}|${expense.currency}`;
    const entry = byCategory.get(key) ?? { name: expense.category.name, amount: 0, currency: expense.currency };
    entry.amount += expense.amount;
    byCategory.set(key, entry);
  }
  // El rubro más alto se elige en pesos (lo habitual); si solo hubo dólares, en dólares.
  const categories = [...byCategory.values()];
  const pool = categories.some((c) => c.currency === "ARS") ? categories.filter((c) => c.currency === "ARS") : categories;
  const topCategory = pool.reduce<(typeof pool)[number] | null>((best, c) => (!best || c.amount > best.amount ? c : best), null);

  const bySupply = new Map<string, WeeklySummaryData["consumption"][number]>();
  for (const movement of consumptions) {
    const entry = bySupply.get(movement.supplyId) ?? {
      supply: movement.supply.name,
      quantity: 0,
      unit: movement.supply.unit,
      cost: null,
      currency: null,
    };
    entry.quantity += movement.quantity;
    if (movement.unitCost !== null && movement.currency) {
      entry.cost = (entry.cost ?? 0) + movement.quantity * movement.unitCost;
      entry.currency = movement.currency;
    }
    bySupply.set(movement.supplyId, entry);
  }
  const consumption = [...bySupply.values()].sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0) || b.quantity - a.quantity).slice(0, 3);

  const count = (type: string) => livestock.filter((e) => e.type === type).reduce((sum, e) => sum + e.quantity, 0);
  const salesAmount: Partial<Record<Currency, number>> = {};
  livestock
    .filter((e) => e.type === "SALE" && e.amount !== null && e.currency)
    .forEach((e) => (salesAmount[e.currency!] = (salesAmount[e.currency!] ?? 0) + e.amount!));

  return {
    fieldName,
    from: period.from,
    to: period.to,
    expenses: { byCurrency, topCategory },
    consumption,
    livestock: { births: count("BIRTH"), purchases: count("PURCHASE"), sales: count("SALE"), salesAmount, deaths: count("DEATH") },
    tasks: {
      completed: tasks.find((t) => t.status === "COMPLETED")?._count ?? 0,
      pending: tasks.find((t) => t.status === "PENDING")?._count ?? 0,
    },
    records: { total: records, fromWhatsApp },
    lowStock: lowStock.map((s) => ({ supply: s.name, quantity: s.quantity, unit: s.unit })),
  };
}

/** Manda el resumen a un destinatario. Primero como texto; si Meta lo rechaza
 *  porque pasaron más de 24 hs desde el último mensaje de esa persona, usa la
 *  plantilla aprobada (WHATSAPP_WEEKLY_SUMMARY_TEMPLATE), que lleva el campo y
 *  el resumen en una línea. */
export async function deliverWeeklySummary(waId: string, data: WeeklySummaryData): Promise<"text" | "template"> {
  try {
    await sendWhatsAppText(waId, weeklySummaryText(data));
    return "text";
  } catch (error) {
    const template = process.env.WHATSAPP_WEEKLY_SUMMARY_TEMPLATE;
    if (!(error instanceof WhatsAppSendError) || error.code !== OUTSIDE_24H_WINDOW || !template) throw error;
    await sendWhatsAppTemplate(waId, {
      name: template,
      language: process.env.WHATSAPP_WEEKLY_SUMMARY_TEMPLATE_LANG || "es_AR",
      bodyParams: [data.fieldName, weeklySummaryOneLine(data)],
    });
    return "template";
  }
}
