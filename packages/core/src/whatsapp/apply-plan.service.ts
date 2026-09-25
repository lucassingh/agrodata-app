import "server-only";
import { prisma, type Prisma } from "@repo/database";
import { expenseCreateData } from "../expenses/expenses.service";
import { findByNormalizedName, normalizeEntityName } from "./entity-name";
import { describeEffect, type Creation, type Effect, type EntityRef, type MessagePlan } from "./plan-effects";

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
    for (const effect of input.plan.effects) {
      await applyEffect(tx, input.tenantId, input.userId, effect, resolve);
      lines.push(describeEffect(effect));
    }

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
            data: { tenantId, name: creation.name, unit: creation.unit, quantity: 0, categoryId: refId(creation.categoryRef) },
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

async function applyEffect(
  tx: Tx,
  tenantId: string,
  userId: string,
  effect: Effect,
  resolve: (ref: EntityRef) => string,
) {
  switch (effect.kind) {
    case "expense": {
      await tx.expense.create({
        data: expenseCreateData(tenantId, {
          categoryId: resolve(effect.categoryRef),
          amount: effect.amount,
          currency: effect.currency,
          date: effect.date,
          description: effect.description,
        }),
      });
      return;
    }
    case "stock": {
      const supply = await tx.supply.findFirstOrThrow({ where: { id: resolve(effect.supplyRef), tenantId } });
      // Mismo criterio que `adjustSupplyStock` del dashboard: un egreso no deja stock negativo.
      const quantity =
        effect.direction === "in" ? supply.quantity + effect.quantity : Math.max(0, supply.quantity - effect.quantity);
      await tx.supply.update({ where: { id: supply.id }, data: { quantity } });
      return;
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
      return;
    }
    case "addAnimals": {
      await addToHerd(tx, resolve(effect.pastureRef), effect.animalType, effect.quantity);
      return;
    }
    case "moveAnimals": {
      const herd = await findHerd(tx, effect.fromPastureId, effect.animalType);
      if (!herd || herd.quantity < effect.quantity) {
        throw new Error(`Ya no hay ${effect.quantity} ${effect.animalType} en «${effect.fromPastureName}» para mover`);
      }
      const remaining = herd.quantity - effect.quantity;
      if (remaining === 0) {
        await tx.pastureAnimal.delete({ where: { id: herd.id } });
      } else {
        await tx.pastureAnimal.update({ where: { id: herd.id }, data: { quantity: remaining } });
      }
      await addToHerd(tx, resolve(effect.toPastureRef), herd.animalType, effect.quantity);
      return;
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
      return;
    }
  }
}
