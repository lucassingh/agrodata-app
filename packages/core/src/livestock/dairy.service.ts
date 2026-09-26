import "server-only";
import { prisma } from "@repo/database";
import { z } from "zod";
import { notFound } from "../errors";
import { inBothCurrencies, rateOn } from "../economy/economy-math";
import { ratesForKind } from "../economy/exchange-rates.service";
import { costForCondition, suggestVatRate } from "../economy/vat";
import { feedMargin, isFeedSupply, litersPerCow, milkSummary, settlementPricePerLiter } from "./livestock-math";

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const dayDate = (day: string) => new Date(`${day}T00:00:00Z`);
const dayOf = (date: Date) => date.toISOString().slice(0, 10);

export const milkRecordSchema = z.object({
  date: isoDay,
  liters: z.number().positive("Ingresá los litros"),
  cowsMilking: z.number().int().positive().optional(),
  cowsDry: z.number().int().nonnegative().optional(),
});
export type MilkRecordInput = z.infer<typeof milkRecordSchema>;

export const milkSettlementSchema = z.object({
  periodStart: isoDay,
  periodEnd: isoDay,
  dairy: z.string().trim().max(120).optional(),
  liters: z.number().positive("Ingresá los litros liquidados"),
  fatPct: z.number().min(0).max(10).optional(),
  proteinPct: z.number().min(0).max(10).optional(),
  pricePerLiter: z.number().positive().optional(),
  totalAmount: z.number().positive("Ingresá el importe total"),
  currency: z.enum(["ARS", "USD"]).default("ARS"),
});
export type MilkSettlementInput = z.input<typeof milkSettlementSchema>;

/** Carga o reemplaza los litros de un día (un registro por día). */
export async function saveMilkRecord(tenantId: string, input: MilkRecordInput) {
  const date = dayDate(input.date);
  const data = { liters: input.liters, cowsMilking: input.cowsMilking ?? null, cowsDry: input.cowsDry ?? null };
  return prisma.milkRecord.upsert({
    where: { tenantId_date: { tenantId, date } },
    create: { tenantId, date, ...data },
    update: data,
  });
}

export async function deleteMilkRecord(tenantId: string, id: string) {
  const record = await prisma.milkRecord.findFirst({ where: { id, tenantId } });
  if (!record) notFound("Registro de leche no encontrado");
  await prisma.milkRecord.delete({ where: { id } });
}

export async function createMilkSettlement(tenantId: string, input: z.output<typeof milkSettlementSchema>) {
  return prisma.milkSettlement.create({
    data: {
      tenantId,
      periodStart: dayDate(input.periodStart),
      periodEnd: dayDate(input.periodEnd),
      dairy: input.dairy,
      liters: input.liters,
      fatPct: input.fatPct,
      proteinPct: input.proteinPct,
      pricePerLiter: input.pricePerLiter ?? Math.round((input.totalAmount / input.liters) * 10_000) / 10_000,
      totalAmount: input.totalAmount,
      currency: input.currency,
    },
  });
}

export async function deleteMilkSettlement(tenantId: string, id: string) {
  const settlement = await prisma.milkSettlement.findFirst({ where: { id, tenantId } });
  if (!settlement) notFound("Liquidación no encontrada");
  await prisma.milkSettlement.delete({ where: { id } });
}

export function hasDairyData(tenantId: string) {
  return prisma.milkRecord.count({ where: { tenantId } }).then((n) => n > 0);
}

/** Tablero del tambo para un período: litros, L/vaca/día, liquidaciones y margen
 *  sobre alimentación por litro. El alimento es el consumo de stock de insumos de
 *  alimentación del período, valorizado a su costo (sin IVA para un responsable
 *  inscripto, con IVA para un monotributista). Todo en pesos: lo que esté en
 *  dólares se pasa con el dólar del campo en su fecha. */
export async function getDairyOverview(tenantId: string, period: { from: string; to: string }) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { exchangeRateKind: true, vatCondition: true } });
  const kind = tenant?.exchangeRateKind ?? "MAYORISTA";
  const vatCondition = tenant?.vatCondition ?? "RESPONSABLE_INSCRIPTO";
  const range = { gte: dayDate(period.from), lte: dayDate(period.to) };
  const momentRange = { gte: new Date(`${period.from}T00:00:00-03:00`), lte: new Date(`${period.to}T23:59:59.999-03:00`) };

  const [records, settlements, lastSettlement, movements] = await Promise.all([
    prisma.milkRecord.findMany({ where: { tenantId, date: range }, orderBy: { date: "asc" } }),
    prisma.milkSettlement.findMany({ where: { tenantId, periodEnd: range }, orderBy: { periodEnd: "desc" } }),
    prisma.milkSettlement.findFirst({ where: { tenantId, periodEnd: { lte: range.lte } }, orderBy: { periodEnd: "desc" } }),
    prisma.stockMovement.findMany({
      where: { tenantId, direction: "OUT", source: { not: "INITIAL" }, date: momentRange },
      include: { supply: { include: { category: true } } },
    }),
  ]);

  const rates = await ratesForKind(kind, period.from);
  const toArs = (amount: number, currency: "ARS" | "USD", day: string) =>
    currency === "ARS" ? amount : inBothCurrencies(amount, "USD", rateOn(rates, day)).ars;

  const days = records.map((r) => ({
    id: r.id,
    day: dayOf(r.date),
    liters: r.liters,
    cowsMilking: r.cowsMilking,
    cowsDry: r.cowsDry,
    litersPerCow: litersPerCow({ day: dayOf(r.date), liters: r.liters, cowsMilking: r.cowsMilking }),
  }));
  const summary = milkSummary(days);

  // Precio por litro: el promedio ponderado de las liquidaciones del período o,
  // si no hay, la última anterior (se marca como referencia).
  const settlementRows = settlements.map((s) => ({
    id: s.id,
    periodStart: dayOf(s.periodStart),
    periodEnd: dayOf(s.periodEnd),
    dairy: s.dairy,
    liters: s.liters,
    fatPct: s.fatPct,
    proteinPct: s.proteinPct,
    pricePerLiter: settlementPricePerLiter(s),
    totalAmount: s.totalAmount,
    currency: s.currency,
    totalArs: toArs(s.totalAmount, s.currency, dayOf(s.periodEnd)),
  }));
  const settledLiters = settlementRows.reduce((sum, s) => sum + (s.totalArs !== null ? s.liters : 0), 0);
  const settledArs = settlementRows.reduce((sum, s) => sum + (s.totalArs ?? 0), 0);
  const reference =
    settledLiters > 0 || !lastSettlement
      ? null
      : toArs(settlementPricePerLiter(lastSettlement) ?? 0, lastSettlement.currency, dayOf(lastSettlement.periodEnd));
  const incomePerLiter = settledLiters > 0 ? settledArs / settledLiters : reference;

  const feedBySupply = new Map<string, { supply: string; unit: string | null; quantity: number; costArs: number }>();
  let unvalued = 0;
  for (const m of movements) {
    const supply = m.supply;
    if (!isFeedSupply({ categoryCode: supply.category.code, categoryName: supply.category.name, supplyName: supply.name })) continue;
    const entry = feedBySupply.get(supply.id) ?? { supply: supply.name, unit: supply.unit, quantity: 0, costArs: 0 };
    entry.quantity += m.quantity;
    const net = m.unitCost !== null && m.currency ? toArs(m.quantity * m.unitCost, m.currency, dayOf(m.date)) : null;
    if (net === null) unvalued++;
    else entry.costArs += costForCondition(net, supply.vatRate ?? suggestVatRate(supply.category.name, supply.name), vatCondition);
    feedBySupply.set(supply.id, entry);
  }
  const feed = [...feedBySupply.values()].sort((a, b) => b.costArs - a.costArs);
  const feedCost = feed.reduce((sum, f) => sum + f.costArs, 0);

  return {
    period,
    vatCondition,
    days,
    summary,
    settlements: settlementRows,
    priceIsReference: settledLiters === 0 && reference !== null,
    feed,
    feedUnvalued: unvalued,
    margin: feedMargin({ incomePerLiter, feedCost, liters: summary.liters }),
  };
}
