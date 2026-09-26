import "server-only";
import { prisma, type Prisma } from "@repo/database";
import { z } from "zod";
import { badRequest, notFound } from "../errors";
import { findByNormalizedName, normalizeEntityName } from "../whatsapp/entity-name";
import { adpv, groupPerformance, type GroupPerformance } from "./livestock-math";

type Db = Prisma.TransactionClient | typeof prisma;

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
/** Las pesadas son de un día: se guardan al mediodía de Argentina (mismo criterio que el bot). */
const dayDate = (day: string) => new Date(`${day}T12:00:00-03:00`);
const argentinaDay = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(date);

export const weighingSchema = z.object({
  pastureId: z.string().min(1, "Elegí un potrero"),
  animalType: z.string().trim().min(1, "Ingresá la categoría").max(100),
  date: isoDay,
  headCount: z.number().int().positive("Ingresá las cabezas"),
  averageKg: z.number().positive("Ingresá el peso promedio"),
});
export type WeighingInput = z.infer<typeof weighingSchema>;

export const weighingImportSchema = z
  .array(
    z.object({
      pasture: z.string().trim().min(1),
      animalType: z.string().trim().min(1),
      day: isoDay,
      headCount: z.number().int().positive(),
      averageKg: z.number().positive(),
    }),
  )
  .min(1, "La planilla no tiene pesadas");
export type WeighingImportRow = z.infer<typeof weighingImportSchema>[number];

/** Nombre de categoría existente (misma forma normalizada) o el que vino. */
async function canonicalAnimalType(db: Db, tenantId: string, name: string): Promise<string> {
  const [categories, herds] = await Promise.all([
    db.animalCategory.findMany({ where: { tenantId }, select: { name: true } }),
    db.pastureAnimal.findMany({ where: { pasture: { tenantId } }, select: { animalType: true } }),
  ]);
  const known = [...categories.map((c) => c.name), ...herds.map((h) => h.animalType)].map((n) => ({ name: n }));
  return findByNormalizedName(known, name)?.name ?? name.trim();
}

/** Pesada anterior del mismo grupo (potrero + categoría), para el ADPV. */
async function previousWeighing(db: Db, tenantId: string, pastureId: string, animalType: string, before: Date) {
  const candidates = await db.weighing.findMany({
    where: { tenantId, pastureId, date: { lt: before } },
    orderBy: { date: "desc" },
    take: 20,
  });
  return candidates.find((w) => normalizeEntityName(w.animalType) === normalizeEntityName(animalType)) ?? null;
}

/** Carga una pesada y devuelve su ADPV contra la anterior del grupo, si hay. */
export async function recordWeighing(
  db: Db,
  tenantId: string,
  input: { pastureId: string; animalType: string; day: string; headCount: number; averageKg: number; source: string; recordId?: string | null },
) {
  const animalType = await canonicalAnimalType(db, tenantId, input.animalType);
  const date = dayDate(input.day);
  const previous = await previousWeighing(db, tenantId, input.pastureId, animalType, date);
  const weighing = await db.weighing.create({
    data: {
      tenantId,
      pastureId: input.pastureId,
      animalType,
      date,
      headCount: input.headCount,
      averageKg: input.averageKg,
      source: input.source,
      recordId: input.recordId ?? null,
    },
  });
  const gain = previous
    ? adpv(
        { day: argentinaDay(previous.date), headCount: previous.headCount, averageKg: previous.averageKg },
        { day: input.day, headCount: input.headCount, averageKg: input.averageKg },
      )
    : null;
  return { weighing, previousDay: previous ? argentinaDay(previous.date) : null, adpv: gain };
}

export async function createWeighing(tenantId: string, input: WeighingInput) {
  const pasture = await prisma.pasture.findFirst({ where: { id: input.pastureId, tenantId } });
  if (!pasture) notFound("Potrero no encontrado");
  return recordWeighing(prisma, tenantId, { ...input, day: input.date, source: "WEB" });
}

/** Importa una planilla ya agrupada. Todo o nada: si un potrero no existe, no se
 *  carga ninguna pesada y se avisa cuáles faltan. */
export async function importWeighings(tenantId: string, rows: WeighingImportRow[]) {
  const pastures = await prisma.pasture.findMany({ where: { tenantId }, select: { id: true, name: true } });
  const missing = [...new Set(rows.filter((r) => !findByNormalizedName(pastures, r.pasture)).map((r) => r.pasture))];
  if (missing.length > 0) {
    badRequest(`No existen estos potreros: ${missing.join(", ")}. Crealos en Potreros o corregí la planilla.`);
  }
  return prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const pasture = findByNormalizedName(pastures, row.pasture)!;
      await recordWeighing(tx, tenantId, { ...row, pastureId: pasture.id, source: "EXCEL" });
    }
    return rows.length;
  });
}

export async function deleteWeighing(tenantId: string, id: string) {
  const weighing = await prisma.weighing.findFirst({ where: { id, tenantId } });
  if (!weighing) notFound("Pesada no encontrada");
  await prisma.weighing.delete({ where: { id } });
}

export interface LivestockGroup {
  key: string;
  pastureId: string;
  pastureName: string;
  hectares: number | null;
  animalType: string;
  /** Cabezas que hay hoy en el potrero según Potreros. */
  currentHeads: number | null;
  performance: GroupPerformance;
  weighings: { id: string; day: string; headCount: number; averageKg: number; source: string }[];
}

/** Grupos de hacienda (categoría en un potrero) con sus pesadas y su rendimiento:
 *  los que tienen pesadas y los que hoy tienen animales. */
export async function getLivestockGroups(tenantId: string): Promise<LivestockGroup[]> {
  const [pastures, weighings] = await Promise.all([
    prisma.pasture.findMany({ where: { tenantId }, include: { animals: true }, orderBy: { name: "asc" } }),
    prisma.weighing.findMany({ where: { tenantId, pastureId: { not: null } }, orderBy: { date: "asc" } }),
  ]);

  const groups = new Map<string, LivestockGroup>();
  const ensure = (pasture: (typeof pastures)[number], animalType: string) => {
    const key = `${pasture.id}|${normalizeEntityName(animalType)}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        pastureId: pasture.id,
        pastureName: pasture.name,
        hectares: pasture.hectares,
        animalType,
        currentHeads: null,
        performance: groupPerformance([], pasture.hectares),
        weighings: [],
      };
      groups.set(key, group);
    }
    return group;
  };

  for (const pasture of pastures) {
    for (const herd of pasture.animals) {
      const group = ensure(pasture, herd.animalType);
      group.currentHeads = (group.currentHeads ?? 0) + herd.quantity;
    }
  }
  for (const w of weighings) {
    const pasture = pastures.find((p) => p.id === w.pastureId);
    if (!pasture) continue;
    ensure(pasture, w.animalType).weighings.push({
      id: w.id,
      day: argentinaDay(w.date),
      headCount: w.headCount,
      averageKg: w.averageKg,
      source: w.source,
    });
  }
  for (const group of groups.values()) {
    group.performance = groupPerformance(group.weighings, group.hectares);
  }
  return [...groups.values()].sort(
    (a, b) => a.pastureName.localeCompare(b.pastureName) || a.animalType.localeCompare(b.animalType),
  );
}

