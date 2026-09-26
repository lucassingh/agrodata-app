import "server-only";
import { prisma, type Prisma } from "@repo/database";
import { z } from "zod";
import { notFound } from "../errors";
import { reproIndices, serviceSeasonLabel, serviceYearOf } from "./livestock-math";

type Db = Prisma.TransactionClient | typeof prisma;

const argentinaDay = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(date);
const dayDate = (day: string) => new Date(`${day}T12:00:00-03:00`);

export const reproEventSchema = z.object({
  type: z.enum(["SERVICE_START", "PREGNANCY_CHECK", "WEANING"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  rodeoId: z.string().min(1).optional(),
  animalType: z.string().trim().max(100).optional(),
  females: z.number().int().positive().optional(),
  pregnant: z.number().int().nonnegative().optional(),
  empty: z.number().int().nonnegative().optional(),
  weaned: z.number().int().positive().optional(),
});
export type ReproEventInput = z.infer<typeof reproEventSchema>;

/** Carga un evento reproductivo (servicio, tacto o destete). Los partos no van
 *  acá: son nacimientos (suman terneros) y se cuentan desde el historial de hacienda. */
export async function recordReproEvent(
  db: Db,
  tenantId: string,
  input: Omit<ReproEventInput, "date"> & { day: string; recordId?: string | null },
) {
  return db.reproEvent.create({
    data: {
      tenantId,
      type: input.type,
      date: dayDate(input.day),
      rodeoId: input.rodeoId ?? null,
      animalType: input.animalType ?? null,
      females: input.females ?? null,
      pregnant: input.pregnant ?? null,
      empty: input.empty ?? null,
      weaned: input.weaned ?? null,
      recordId: input.recordId ?? null,
    },
  });
}

export async function createReproEvent(tenantId: string, input: ReproEventInput) {
  if (input.rodeoId) {
    const rodeo = await prisma.rodeo.findFirst({ where: { id: input.rodeoId, tenantId } });
    if (!rodeo) notFound("Rodeo no encontrado");
  }
  return recordReproEvent(prisma, tenantId, { ...input, day: input.date });
}

export async function deleteReproEvent(tenantId: string, id: string) {
  const event = await prisma.reproEvent.findFirst({ where: { id, tenantId } });
  if (!event) notFound("Evento no encontrado");
  await prisma.reproEvent.delete({ where: { id } });
}

export interface ReproSeason {
  serviceYear: number;
  label: string;
  females: number | null;
  pregnant: number | null;
  empty: number | null;
  births: number;
  weaned: number;
  pregnancyPct: number | null;
  calvingPct: number | null;
  weaningPct: number | null;
  events: {
    id: string;
    type: "SERVICE_START" | "PREGNANCY_CHECK" | "CALVING" | "WEANING";
    day: string;
    rodeo: string | null;
    females: number | null;
    pregnant: number | null;
    empty: number | null;
    weaned: number | null;
  }[];
}

/** Índices reproductivos del campo por temporada de servicio. Por cada rodeo se
 *  toma el último inicio de servicio y el último tacto de la temporada y se suman;
 *  los partos salen de los nacimientos del historial de hacienda. Vacas en
 *  servicio: las informadas o, si no, las del tacto (preñadas + vacías). */
export async function getReproSeasons(tenantId: string): Promise<ReproSeason[]> {
  const [events, births] = await Promise.all([
    prisma.reproEvent.findMany({ where: { tenantId }, include: { rodeo: { select: { name: true } } }, orderBy: { date: "asc" } }),
    prisma.livestockEvent.findMany({ where: { tenantId, type: "BIRTH" }, select: { date: true, quantity: true } }),
  ]);

  const seasons = new Map<number, { events: ReproSeason["events"]; births: number }>();
  const season = (year: number) => {
    const existing = seasons.get(year) ?? { events: [], births: 0 };
    seasons.set(year, existing);
    return existing;
  };
  for (const e of events) {
    const day = argentinaDay(e.date);
    season(serviceYearOf(e.type, day)).events.push({
      id: e.id,
      type: e.type,
      day,
      rodeo: e.rodeo?.name ?? null,
      females: e.females,
      pregnant: e.pregnant,
      empty: e.empty,
      weaned: e.weaned,
    });
  }
  for (const b of births) season(serviceYearOf("CALVING", argentinaDay(b.date))).births += b.quantity;

  return [...seasons.entries()]
    .map(([serviceYear, data]) => ({
      serviceYear,
      label: serviceSeasonLabel(serviceYear),
      ...reproIndices(
        data.events.filter((e): e is typeof e & { type: "SERVICE_START" | "PREGNANCY_CHECK" | "WEANING" } => e.type !== "CALVING"),
        data.births,
      ),
      events: [...data.events].reverse(),
    }))
    .sort((a, b) => b.serviceYear - a.serviceYear);
}
