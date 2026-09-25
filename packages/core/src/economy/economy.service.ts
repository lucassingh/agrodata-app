import "server-only";
import { prisma } from "@repo/database";
import { notFound } from "../errors";
import { campaignResult, inBothCurrencies, rateOn, type CampaignResult, type Currency } from "./economy-math";
import { EXCHANGE_RATE_LABEL, type ExchangeRateKind } from "./exchange-rates";
import { ratesForKind } from "./exchange-rates.service";
import { z } from "zod";

/** Día de una fecha para buscar su cotización: los campos de solo fecha se
 *  guardan a medianoche UTC (su día es el UTC); los momentos, en día argentino. */
function rateDay(date: Date): string {
  const iso = date.toISOString();
  if (iso.endsWith("T00:00:00.000Z")) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(date);
}

export interface EconomyLine {
  id: string;
  date: string;
  concept: string;
  /** De dónde sale: un gasto, un consumo de stock o una venta. */
  origin: "expense" | "stock" | "sale" | "other";
  amount: number;
  currency: Currency;
  usd: number | null;
  ars: number | null;
  /** Cotización usada (pesos por dólar) y si vino del comprobante. */
  rate: number | null;
  rateFromDocument: boolean;
}

export interface CampaignEconomy {
  id: string;
  pastureId: string;
  pastureName: string;
  crop: string;
  season: string;
  status: "IN_PROGRESS" | "HARVESTED" | "CLOSED";
  hectares: number | null;
  sowingDate: string | null;
  referencePrice: number | null;
  harvestedKg: number;
  harvests: { id: string; date: string; totalKg: number; moisture: number | null }[];
  costs: EconomyLine[];
  incomes: (EconomyLine & { quantityKg: number | null; counterparty: string | null })[];
  result: CampaignResult;
}

async function tenantRateKind(tenantId: string): Promise<ExchangeRateKind> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { exchangeRateKind: true } });
  return tenant?.exchangeRateKind ?? "MAYORISTA";
}

/** Campañas con costos e ingresos convertidos al dólar elegido por el campo, en
 *  la fecha de cada uno, y su resultado. Cada línea lleva su cotización, así cada
 *  número del módulo Economía se puede rastrear. */
export async function getEconomyOverview(tenantId: string, season?: string) {
  const kind = await tenantRateKind(tenantId);
  const campaigns = await prisma.campaign.findMany({
    where: { tenantId, ...(season ? { season } : {}) },
    include: {
      pasture: { select: { name: true } },
      allocations: { include: { expense: { select: { exchangeRate: true } } }, orderBy: { date: "desc" } },
      harvests: { orderBy: { date: "desc" } },
      incomes: { orderBy: { date: "desc" } },
    },
    orderBy: [{ season: "desc" }, { crop: "asc" }],
  });

  const dates = campaigns.flatMap((c) => [...c.allocations.map((a) => a.date), ...c.incomes.map((i) => i.date)]);
  const firstDay = dates.length > 0 ? rateDay(new Date(Math.min(...dates.map((d) => d.getTime())))) : undefined;
  const rates = dates.length > 0 ? await ratesForKind(kind, firstDay) : [];

  const line = (input: {
    id: string;
    date: Date;
    concept: string;
    origin: EconomyLine["origin"];
    amount: number;
    currency: Currency;
    documentRate: number | null;
  }): EconomyLine => {
    const day = rateDay(input.date);
    const rate = input.documentRate ?? rateOn(rates, day);
    const both = inBothCurrencies(input.amount, input.currency, rate);
    return {
      id: input.id,
      date: day,
      concept: input.concept,
      origin: input.origin,
      amount: input.amount,
      currency: input.currency,
      usd: both.usd,
      ars: both.ars,
      rate,
      rateFromDocument: input.documentRate !== null,
    };
  };

  const rows: CampaignEconomy[] = campaigns.map((c) => {
    const costs = c.allocations.map((a) =>
      line({
        id: a.id,
        date: a.date,
        concept: a.concept,
        origin: a.expenseId ? "expense" : a.stockMovementId ? "stock" : "other",
        amount: a.amount,
        currency: a.currency,
        documentRate: a.expense?.exchangeRate ?? null,
      }),
    );
    const incomes = c.incomes.map((i) => ({
      ...line({
        id: i.id,
        date: i.date,
        concept: [i.crop, i.counterparty].filter(Boolean).join(" · ") || i.description || "Venta",
        origin: "sale" as const,
        amount: i.amount,
        currency: i.currency,
        documentRate: i.exchangeRate,
      }),
      quantityKg: i.quantityKg,
      counterparty: i.counterparty,
    }));
    const harvestedKg = c.harvests.reduce((sum, h) => sum + h.totalKg, 0);
    return {
      id: c.id,
      pastureId: c.pastureId,
      pastureName: c.pasture.name,
      crop: c.crop,
      season: c.season,
      status: c.status,
      hectares: c.hectares,
      sowingDate: c.sowingDate ? rateDay(c.sowingDate) : null,
      referencePrice: c.referencePrice,
      harvestedKg,
      harvests: c.harvests.map((h) => ({ id: h.id, date: rateDay(h.date), totalKg: h.totalKg, moisture: h.moisture })),
      costs,
      incomes,
      result: campaignResult({
        hectares: c.hectares,
        costs: costs.map((l) => ({ usd: l.usd, ars: l.ars })),
        incomes: incomes.map((l) => ({ usd: l.usd, ars: l.ars, quantityKg: l.quantityKg })),
        harvestedKg,
        referencePrice: c.referencePrice,
      }),
    };
  });

  const latest = await prisma.exchangeRate.findFirst({ where: { kind }, orderBy: { date: "desc" } });
  return {
    rateKind: kind,
    rateLabel: EXCHANGE_RATE_LABEL[kind],
    latestRate: latest ? { day: latest.date.toISOString().slice(0, 10), sell: latest.sell, updatedAt: latest.updatedAt.toISOString() } : null,
    campaigns: rows,
  };
}

// ── Cosechas e ingresos desde la web ───────────────────────

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const createHarvestSchema = z.object({
  date: isoDay,
  totalKg: z.number().positive("Ingresá los kilos cosechados"),
  moisture: z.number().min(0).max(100).optional(),
});
export type CreateHarvestInput = z.infer<typeof createHarvestSchema>;

export const createIncomeSchema = z.object({
  campaignId: z.string().min(1).nullable(),
  date: isoDay,
  crop: z.string().trim().max(100).optional(),
  quantityKg: z.number().positive().optional(),
  amount: z.number().positive("Ingresá el monto"),
  currency: z.enum(["ARS", "USD"]),
  exchangeRate: z.number().positive().optional(),
  counterparty: z.string().trim().max(200).optional(),
});
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;

const dayDate = (day: string) => new Date(`${day}T12:00:00-03:00`);

async function assertCampaign(tenantId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, tenantId } });
  if (!campaign) notFound("Campaña no encontrada");
  return campaign;
}

export async function createHarvest(tenantId: string, campaignId: string, input: CreateHarvestInput) {
  await assertCampaign(tenantId, campaignId);
  await prisma.$transaction([
    prisma.harvest.create({
      data: { tenantId, campaignId, date: dayDate(input.date), totalKg: input.totalKg, moisture: input.moisture },
    }),
    prisma.campaign.update({ where: { id: campaignId }, data: { status: "HARVESTED" } }),
  ]);
}

export async function deleteHarvest(tenantId: string, id: string) {
  const harvest = await prisma.harvest.findFirst({ where: { id, tenantId } });
  if (!harvest) notFound("Cosecha no encontrada");
  await prisma.harvest.delete({ where: { id } });
}

export async function createIncome(tenantId: string, input: CreateIncomeInput) {
  const campaign = input.campaignId ? await assertCampaign(tenantId, input.campaignId) : null;
  return prisma.income.create({
    data: {
      tenantId,
      campaignId: campaign?.id ?? null,
      type: "GRAIN_SALE",
      date: dayDate(input.date),
      crop: input.crop ?? campaign?.crop,
      quantityKg: input.quantityKg,
      amount: input.amount,
      currency: input.currency,
      exchangeRate: input.exchangeRate,
      counterparty: input.counterparty,
    },
  });
}

export async function deleteIncome(tenantId: string, id: string) {
  const income = await prisma.income.findFirst({ where: { id, tenantId } });
  if (!income) notFound("Ingreso no encontrado");
  await prisma.income.delete({ where: { id } });
}

/** Ingresos que no quedaron asignados a una campaña (ej. venta ambigua por WhatsApp). */
export function listUnassignedIncomes(tenantId: string) {
  return prisma.income.findMany({ where: { tenantId, campaignId: null }, orderBy: { date: "desc" } });
}

export async function assignIncome(tenantId: string, id: string, campaignId: string) {
  const income = await prisma.income.findFirst({ where: { id, tenantId } });
  if (!income) notFound("Ingreso no encontrado");
  await assertCampaign(tenantId, campaignId);
  await prisma.income.update({ where: { id }, data: { campaignId } });
}
