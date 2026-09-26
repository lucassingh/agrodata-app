import "server-only";
import { prisma, type Prisma } from "@repo/database";
import { expenseCreateData } from "../expenses/expenses.service";
import { applyStockChange } from "../supplies/stock-movements.service";
import { findByNormalizedName, normalizeEntityName } from "./entity-name";
import { describeEffect, type Creation, type Effect, type EntityRef, type MessagePlan } from "./plan-effects";
import { ensureCampaign } from "../economy/campaigns.service";
import { allocateCost, resolveCampaignForPasture, type CostSource } from "../economy/allocations.service";
import { formatMoney, formatQuantity } from "./farm-event";
import { netOfVat, suggestVatRate } from "../economy/vat";
import { recordWeighing } from "../livestock/weighings.service";

type Tx = Prisma.TransactionClient;

/** Clave en `Record.data` con lo que el mensaje generó en el sistema. Se lee en
 *  Datos y sirve de guarda de idempotencia: si ya está, el plan no se re-aplica. */
export const RECORD_EFFECTS_KEY = "efectos";

export interface ApplyPlanResult {
  lines: string[];
  alreadyApplied: boolean;
}

/** Crea lo que falte y aplica todos los efectos del plan en UNA transacción:
 *  o se carga todo, o nada. Anota en el `Record` del mensaje qué se hizo; si el
 *  `Record` ya lo tenía (ej. Inngest reintentó el paso después de un commit),
 *  no vuelve a aplicar nada. */
export async function applyMessagePlan(input: {
  tenantId: string;
  userId: string;
  recordId: string;
  plan: MessagePlan;
}): Promise<ApplyPlanResult> {
  return prisma.$transaction(async (tx) => {
    const record = await tx.record.findFirst({ where: { id: input.recordId, tenantId: input.tenantId } });
    if (!record) throw new Error(`No existe el registro ${input.recordId} del mensaje`);

    const data = (record.data ?? {}) as Record<string, unknown>;
    const previous = data[RECORD_EFFECTS_KEY];
    if (Array.isArray(previous)) {
      return { lines: previous.map(String), alreadyApplied: true };
    }

    const ids = await applyCreations(tx, input.tenantId, input.plan.creations);
    const resolve = (ref: EntityRef): string => {
      if ("existingId" in ref) return ref.existingId;
      const id = ids.get(ref.newKey);
      if (!id) throw new Error(`Falta crear ${ref.newKey}`);
      return id;
    };

    const lines: string[] = [];
    const costs: PendingCost[] = [];
    for (const effect of input.plan.effects) {
      const extra: string[] = [];
      const cost = await applyEffect(
        tx,
        { tenantId: input.tenantId, userId: input.userId, recordId: record.id, extraLines: extra },
        effect,
        resolve,
      );
      if (cost) costs.push(cost);
      lines.push(describeEffect(effect), ...extra);
    }
    // Al final: así una campaña que abrió este mismo mensaje ya recibe sus costos.
    for (const cost of costs) lines.push(await allocatePendingCost(tx, input.tenantId, cost));

    await tx.record.update({
      where: { id: record.id },
      data: { data: { ...data, [RECORD_EFFECTS_KEY]: lines } as Prisma.InputJsonValue },
    });

    return { lines, alreadyApplied: false };
  });
}

/** Crea cada entidad faltante. Si mientras tanto alguien la creó desde el
 *  dashboard (mismo nombre normalizado), usa esa en vez de duplicarla. */
async function applyCreations(tx: Tx, tenantId: string, creations: Creation[]): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  const refId = (ref: EntityRef) => ("existingId" in ref ? ref.existingId : ids.get(ref.newKey)!);

  for (const creation of creations) {
    switch (creation.kind) {
      case "expenseCategory": {
        const existing = findByNormalizedName(await tx.expenseCategory.findMany({ where: { tenantId } }), creation.name);
        ids.set(creation.key, existing?.id ?? (await tx.expenseCategory.create({ data: { tenantId, name: creation.name } })).id);
        break;
      }
      case "supplyCategory": {
        const existing = findByNormalizedName(await tx.supplyCategory.findMany({ where: { tenantId } }), creation.name);
        ids.set(creation.key, existing?.id ?? (await tx.supplyCategory.create({ data: { tenantId, name: creation.name } })).id);
        break;
      }
      case "supply": {
        const existing = findByNormalizedName(await tx.supply.findMany({ where: { tenantId } }), creation.name);
        const created =
          existing ??
          (await tx.supply.create({
            data: {
              tenantId,
              name: creation.name,
              unit: creation.unit,
              quantity: 0,
              categoryId: refId(creation.categoryRef),
              vatRate: suggestVatRate(creation.categoryName, creation.name),
            },
          }));
        ids.set(creation.key, created.id);
        break;
      }
      case "pasture": {
        const existing = findByNormalizedName(await tx.pasture.findMany({ where: { tenantId } }), creation.name);
        ids.set(
          creation.key,
          existing?.id ?? (await tx.pasture.create({ data: { tenantId, name: creation.name, hectares: creation.hectares } })).id,
        );
        break;
      }
      case "animalCategory": {
        const existing = findByNormalizedName(await tx.animalCategory.findMany({ where: { tenantId } }), creation.name);
        ids.set(creation.key, existing?.id ?? (await tx.animalCategory.create({ data: { tenantId, name: creation.name } })).id);
        break;
      }
    }
  }
  return ids;
}

async function findHerd(tx: Tx, pastureId: string, animalType: string) {
  const animals = await tx.pastureAnimal.findMany({ where: { pastureId } });
  return animals.find((animal) => normalizeEntityName(animal.animalType) === normalizeEntityName(animalType));
}

async function addToHerd(tx: Tx, pastureId: string, animalType: string, quantity: number) {
  const herd = await findHerd(tx, pastureId, animalType);
  if (herd) {
    await tx.pastureAnimal.update({ where: { id: herd.id }, data: { quantity: herd.quantity + quantity } });
  } else {
    await tx.pastureAnimal.create({ data: { pastureId, animalType, quantity } });
  }
}

/** Fecha de un evento (YYYY-MM-DD) al mediodía de Argentina, para que no se corra de día. */
function eventDate(date: string): Date {
  return new Date(`${date}T12:00:00-03:00`);
}

async function removeFromHerd(tx: Tx, pastureId: string, pastureName: string, animalType: string, quantity: number) {
  const herd = await findHerd(tx, pastureId, animalType);
  if (!herd || herd.quantity < quantity) {
    throw new Error(`Ya no hay ${quantity} ${animalType} en «${pastureName}»`);
  }
  const remaining = herd.quantity - quantity;
  if (remaining === 0) {
    await tx.pastureAnimal.delete({ where: { id: herd.id } });
  } else {
    await tx.pastureAnimal.update({ where: { id: herd.id }, data: { quantity: remaining } });
  }
  return herd.animalType;
}

/** Costo de un lote que se asigna a su campaña después de aplicar todos los efectos. */
interface PendingCost {
  pastureId: string;
  cropHint: string | null;
  source: CostSource;
}

async function allocatePendingCost(tx: Tx, tenantId: string, cost: PendingCost): Promise<string> {
  const { campaign, open } = await resolveCampaignForPasture(tx, tenantId, cost.pastureId, cost.cropHint);
  if (!campaign) {
    const pasture = await tx.pasture.findUniqueOrThrow({ where: { id: cost.pastureId }, select: { name: true } });
    return open.length === 0
      ? `Sin campaña en curso en «${pasture.name}»: el costo no entró a ningún margen.`
      : `«${pasture.name}» tiene ${open.length} campañas en curso: asigná el costo desde Economía.`;
  }
  await allocateCost(tx, tenantId, [campaign.id], cost.source);
  return `Costo de ${formatMoney(cost.source.amount, cost.source.currency)} a la campaña ${campaign.crop} ${campaign.season} de «${campaign.pasture.name}»`;
}

interface ApplyContext {
  tenantId: string;
  userId: string;
  recordId: string;
  /** Datos que solo se conocen al aplicar (ej. el ADPV de una pesada), para la respuesta. */
  extraLines: string[];
}

async function applyEffect(
  tx: Tx,
  { tenantId, userId, recordId, extraLines }: ApplyContext,
  effect: Effect,
  resolve: (ref: EntityRef) => string,
): Promise<PendingCost | null> {
  switch (effect.kind) {
    case "expense": {
      const vatRate = suggestVatRate(effect.categoryName, effect.description);
      const expense = await tx.expense.create({
        data: expenseCreateData(tenantId, {
          categoryId: resolve(effect.categoryRef),
          amount: effect.amount,
          currency: effect.currency,
          date: effect.date,
          description: effect.description,
          vatRate,
        }),
      });
      return effect.pastureId
        ? {
            pastureId: effect.pastureId,
            cropHint: effect.cropHint,
            source: {
              expenseId: expense.id,
              // Los importes por WhatsApp se toman con IVA incluido (lo habitual en una factura).
              amount: netOfVat(effect.amount, true, vatRate),
              vatRate,
              currency: effect.currency,
              date: expense.date,
              concept: effect.description,
            },
          }
        : null;
    }
    case "stock": {
      const supply = await tx.supply.findFirstOrThrow({
        where: { id: resolve(effect.supplyRef), tenantId },
        include: { category: { select: { name: true } } },
      });
      const vatRate = supply.vatRate ?? suggestVatRate(supply.category.name, supply.name);
      const { movement } = await applyStockChange(tx, tenantId, {
        supplyId: supply.id,
        direction: effect.direction,
        quantity: effect.quantity,
        source: "WHATSAPP",
        // El costo de stock se guarda sin IVA; el precio del mensaje lo trae incluido.
        unitCost: effect.unitCost !== null ? netOfVat(effect.unitCost, true, vatRate) : null,
        currency: effect.currency,
        pastureId: effect.pastureId,
        recordId,
        userId,
        date: eventDate(effect.date),
      });
      // Un consumo en un lote, con costo, es costo directo de su campaña.
      return movement && movement.direction === "OUT" && movement.pastureId && movement.unitCost !== null && movement.currency
        ? {
            pastureId: movement.pastureId,
            cropHint: effect.cropHint,
            source: {
              stockMovementId: movement.id,
              amount: Math.round(movement.quantity * movement.unitCost * 100) / 100,
              vatRate,
              currency: movement.currency,
              date: movement.date,
              concept: `${effect.supplyName}: ${formatQuantity(movement.quantity, effect.unit)}`,
            },
          }
        : null;
    }
    case "weighing": {
      const result = await recordWeighing(tx, tenantId, {
        pastureId: effect.pastureId,
        animalType: effect.animalType,
        day: effect.day,
        headCount: effect.headCount,
        averageKg: effect.averageKg,
        source: "WHATSAPP",
        recordId,
      });
      if (result.adpv !== null && result.previousDay) {
        extraLines.push(
          `ADPV de ${effect.animalType} en «${effect.pastureName}»: ${formatQuantity(result.adpv, "kg/día")} desde la pesada del ${result.previousDay.slice(8, 10)}/${result.previousDay.slice(5, 7)}`,
        );
      }
      return null;
    }
    case "milkRecord": {
      const date = new Date(`${effect.day}T00:00:00Z`);
      const data = { liters: effect.liters, cowsMilking: effect.cowsMilking, cowsDry: effect.cowsDry, recordId };
      // Un registro por día: un mensaje nuevo del mismo día lo reemplaza.
      await tx.milkRecord.upsert({
        where: { tenantId_date: { tenantId, date } },
        create: { tenantId, date, ...data },
        update: data,
      });
      return null;
    }
    case "milkSettlement": {
      await tx.milkSettlement.create({
        data: {
          tenantId,
          periodStart: new Date(`${effect.periodStart}T00:00:00Z`),
          periodEnd: new Date(`${effect.periodEnd}T00:00:00Z`),
          dairy: effect.dairy,
          liters: effect.liters,
          fatPct: effect.fatPct,
          proteinPct: effect.proteinPct,
          pricePerLiter: effect.pricePerLiter,
          totalAmount: effect.totalAmount,
          currency: effect.currency,
          recordId,
        },
      });
      return null;
    }
    case "harvest": {
      await tx.harvest.create({
        data: { tenantId, campaignId: effect.campaignId, date: eventDate(effect.date), totalKg: effect.totalKg, recordId },
      });
      await tx.campaign.update({ where: { id: effect.campaignId }, data: { status: "HARVESTED" } });
      return null;
    }
    case "grainSale": {
      await tx.income.create({
        data: {
          tenantId,
          campaignId: effect.campaignId,
          type: "GRAIN_SALE",
          date: eventDate(effect.date),
          crop: effect.crop,
          quantityKg: effect.quantityKg,
          amount: effect.amount,
          currency: effect.currency,
          counterparty: effect.counterparty,
          recordId,
        },
      });
      return null;
    }
    case "openCampaign": {
      await ensureCampaign(tx, tenantId, {
        pastureId: resolve(effect.pastureRef),
        crop: effect.crop,
        hectares: effect.hectares,
        sowingDay: effect.sowingDate,
        recordId,
      });
      return null;
    }
    case "addCrop": {
      await tx.pastureCrop.create({
        data: {
          pastureId: resolve(effect.pastureRef),
          crop: effect.crop,
          hectares: effect.hectares,
          startDate: new Date(effect.startDate),
        },
      });
      return null;
    }
    case "addAnimals": {
      const pastureId = resolve(effect.pastureRef);
      await addToHerd(tx, pastureId, effect.animalType, effect.quantity);
      await tx.livestockEvent.create({
        data: {
          tenantId,
          pastureId,
          type: effect.reason,
          animalType: effect.animalType,
          quantity: effect.quantity,
          date: eventDate(effect.date),
          amount: effect.deal?.amount ?? null,
          currency: effect.deal?.currency ?? null,
          totalKg: effect.deal?.totalKg ?? null,
          counterparty: effect.deal?.counterparty ?? null,
          recordId,
        },
      });
      return null;
    }
    case "removeAnimals": {
      const animalType = await removeFromHerd(tx, effect.pastureId, effect.pastureName, effect.animalType, effect.quantity);
      await tx.livestockEvent.create({
        data: {
          tenantId,
          pastureId: effect.pastureId,
          type: effect.reason,
          animalType,
          quantity: effect.quantity,
          date: eventDate(effect.date),
          amount: effect.deal?.amount ?? null,
          currency: effect.deal?.currency ?? null,
          totalKg: effect.deal?.totalKg ?? null,
          counterparty: effect.deal?.counterparty ?? null,
          recordId,
        },
      });
      return null;
    }
    case "moveAnimals": {
      const animalType = await removeFromHerd(
        tx,
        effect.fromPastureId,
        effect.fromPastureName,
        effect.animalType,
        effect.quantity,
      );
      const toPastureId = resolve(effect.toPastureRef);
      await addToHerd(tx, toPastureId, animalType, effect.quantity);
      const common = { tenantId, animalType, quantity: effect.quantity, date: eventDate(effect.date), recordId };
      await tx.livestockEvent.createMany({
        data: [
          { ...common, pastureId: effect.fromPastureId, type: "TRANSFER_OUT" },
          { ...common, pastureId: toPastureId, type: "TRANSFER_IN" },
        ],
      });
      return null;
    }
    case "task": {
      const isFertilization = effect.taskType === "FERTILIZACION";
      await tx.task.create({
        data: {
          tenantId,
          type: effect.taskType,
          status: "COMPLETED",
          deadline: new Date(effect.date),
          crop: effect.crop,
          treatment: effect.treatment,
          description: effect.description,
          responsibleId: userId,
          pastures: {
            create: effect.pastures.map((pasture) => ({
              pastureId: resolve(pasture.ref),
              hectares: pasture.hectares !== null ? String(pasture.hectares) : null,
            })),
          },
          products: isFertilization
            ? undefined
            : { create: effect.products.map((p) => ({ productName: p.name, dosis: p.dosis, unit: p.unit })) },
          fertilizers: isFertilization
            ? { create: effect.products.map((p) => ({ source: p.name, dosis: p.dosis, unit: p.unit })) }
            : undefined,
          animals: { create: effect.animals },
        },
      });
      return null;
    }
  }
}
