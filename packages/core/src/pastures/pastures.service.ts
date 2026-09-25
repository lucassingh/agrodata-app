import "server-only";
import { prisma, type Prisma } from "@repo/database";
import { notFound } from "../errors";
import { ensureCampaign } from "../economy/campaigns.service";
import { normalizeEntityName } from "../whatsapp/entity-name";
import { todayInArgentina } from "../whatsapp/farm-event";
import { herdDiff, OUTFLOW_TYPES, type HerdLine } from "./herd";
import type { CreatePastureInput, UpdatePastureInput } from "./pastures.schema";

type Tx = Prisma.TransactionClient;

const PASTURE_INCLUDE = { crops: true, animals: true } as const;

export function listPastures(tenantId: string) {
  return prisma.pasture.findMany({
    where: { tenantId },
    include: PASTURE_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export async function findPasture(tenantId: string, id: string) {
  const pasture = await prisma.pasture.findFirst({
    where: { id, tenantId },
    include: PASTURE_INCLUDE,
  });
  if (!pasture) notFound("Potrero no encontrado");
  return pasture;
}

function cropsCreateData(crops: CreatePastureInput["crops"]) {
  return (crops ?? []).map((c) => ({
    crop: c.crop,
    hectares: c.hectares,
    startDate: c.startDate ? new Date(c.startDate) : undefined,
  }));
}

/** Una edición a mano de la hacienda queda en el historial como ajuste, para que
 *  los movimientos y los días de descanso del potrero cierren. */
async function logHerdAdjustments(tx: Tx, tenantId: string, pastureId: string, before: HerdLine[], after: HerdLine[]) {
  const changes = herdDiff(before, after);
  if (changes.length === 0) return;
  const date = new Date();
  await tx.livestockEvent.createMany({
    data: changes.map((change) => ({
      tenantId,
      pastureId,
      type: change.delta > 0 ? ("ADJUSTMENT_IN" as const) : ("ADJUSTMENT_OUT" as const),
      animalType: change.animalType,
      quantity: Math.abs(change.delta),
      date,
    })),
  });
}

/** Un cultivo nuevo cargado en Potreros es una siembra: abre su campaña. */
async function openCampaignsForNewCrops(
  tx: Tx,
  tenantId: string,
  pastureId: string,
  before: { crop: string }[],
  after: NonNullable<CreatePastureInput["crops"]>,
) {
  const known = new Set(before.map((c) => normalizeEntityName(c.crop)));
  for (const crop of after) {
    if (known.has(normalizeEntityName(crop.crop))) continue;
    const day = crop.startDate && /^\d{4}-\d{2}-\d{2}/.test(crop.startDate) ? crop.startDate.slice(0, 10) : todayInArgentina(new Date());
    await ensureCampaign(tx, tenantId, { pastureId, crop: crop.crop, hectares: crop.hectares ?? null, sowingDay: day });
  }
}

export async function createPasture(tenantId: string, input: CreatePastureInput) {
  return prisma.$transaction(async (tx) => {
    const pasture = await tx.pasture.create({
      data: {
        tenantId,
        name: input.name,
        hectares: input.hectares,
        crops: input.crops?.length ? { createMany: { data: cropsCreateData(input.crops) } } : undefined,
        animals: input.animals?.length ? { createMany: { data: input.animals } } : undefined,
      },
      include: PASTURE_INCLUDE,
    });
    await logHerdAdjustments(tx, tenantId, pasture.id, [], input.animals ?? []);
    await openCampaignsForNewCrops(tx, tenantId, pasture.id, [], input.crops ?? []);
    return pasture;
  });
}

/** El legacy no envuelve esto en transacción -- loop secuencial, falla
 *  parcial posible (algunos potreros creados, otros no). Se replica igual. */
export async function createPasturesBulk(tenantId: string, items: CreatePastureInput[]) {
  const created = [];
  for (const item of items) {
    created.push(await createPasture(tenantId, item));
  }
  return created;
}

export async function updatePasture(
  tenantId: string,
  id: string,
  input: UpdatePastureInput,
) {
  const current = await findPasture(tenantId, id);

  await prisma.$transaction(async (tx) => {
    if (input.crops !== undefined) {
      await openCampaignsForNewCrops(tx, tenantId, id, current.crops, input.crops);
      await tx.pastureCrop.deleteMany({ where: { pastureId: id } });
      if (input.crops.length) {
        await tx.pastureCrop.createMany({
          data: cropsCreateData(input.crops).map((c) => ({ ...c, pastureId: id })),
        });
      }
    }
    if (input.animals !== undefined) {
      await logHerdAdjustments(tx, tenantId, id, current.animals, input.animals);
      await tx.pastureAnimal.deleteMany({ where: { pastureId: id } });
      if (input.animals.length) {
        await tx.pastureAnimal.createMany({
          data: input.animals.map((a) => ({ ...a, pastureId: id })),
        });
      }
    }
    await tx.pasture.update({
      where: { id },
      data: { name: input.name, hectares: input.hectares },
    });
  });

  return findPasture(tenantId, id);
}

export async function deletePasture(tenantId: string, id: string) {
  await findPasture(tenantId, id);
  await prisma.pasture.delete({ where: { id } });
}

/** Movimientos de hacienda de un potrero, del más nuevo al más viejo. */
export function listPastureLivestockEvents(tenantId: string, pastureId: string) {
  return prisma.livestockEvent.findMany({
    where: { tenantId, pastureId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
}

/** Fecha de la última salida de hacienda de cada potrero (para los días de descanso). */
export async function lastOutflowByPasture(tenantId: string): Promise<Record<string, Date>> {
  const rows = await prisma.livestockEvent.groupBy({
    by: ["pastureId"],
    where: { tenantId, pastureId: { not: null }, type: { in: [...OUTFLOW_TYPES] } },
    _max: { date: true },
  });
  const result: Record<string, Date> = {};
  for (const row of rows) {
    if (row.pastureId && row._max.date) result[row.pastureId] = row._max.date;
  }
  return result;
}
