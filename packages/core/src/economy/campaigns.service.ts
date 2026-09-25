import "server-only";
import { prisma, type Prisma } from "@repo/database";
import { notFound } from "../errors";
import { normalizeEntityName } from "../whatsapp/entity-name";
import { todayInArgentina } from "../whatsapp/farm-event";
import type { CreateCampaignInput, UpdateCampaignInput } from "./campaigns.schema";
import { seasonOf } from "./economy-math";

type Db = Prisma.TransactionClient | typeof prisma;

const dayDate = (day: string) => new Date(`${day}T12:00:00-03:00`);

/** Abre la campaña de un cultivo en un lote para el ciclo de esa fecha, salvo
 *  que ya haya una en curso del mismo cultivo y ciclo (entonces la devuelve).
 *  La usan la siembra por WhatsApp y la carga de cultivos en Potreros. */
export async function ensureCampaign(
  db: Db,
  tenantId: string,
  input: { pastureId: string; crop: string; hectares: number | null; sowingDay: string; recordId?: string | null },
) {
  const season = seasonOf(input.sowingDay);
  const open = await db.campaign.findMany({ where: { tenantId, pastureId: input.pastureId, season, status: "IN_PROGRESS" } });
  const existing = open.find((c) => normalizeEntityName(c.crop) === normalizeEntityName(input.crop));
  if (existing) return { campaign: existing, created: false };

  const pasture = await db.pasture.findFirstOrThrow({ where: { id: input.pastureId, tenantId }, select: { hectares: true } });
  const campaign = await db.campaign.create({
    data: {
      tenantId,
      pastureId: input.pastureId,
      crop: input.crop,
      season,
      hectares: input.hectares ?? pasture.hectares,
      sowingDate: dayDate(input.sowingDay),
      recordId: input.recordId ?? null,
    },
  });
  return { campaign, created: true };
}

const CAMPAIGN_INCLUDE = {
  pasture: { select: { id: true, name: true } },
  allocations: { orderBy: { date: "desc" } },
  harvests: { orderBy: { date: "desc" } },
  incomes: { orderBy: { date: "desc" } },
} as const satisfies Prisma.CampaignInclude;

export function listCampaigns(tenantId: string, season?: string) {
  return prisma.campaign.findMany({
    where: { tenantId, ...(season ? { season } : {}) },
    include: CAMPAIGN_INCLUDE,
    orderBy: [{ season: "desc" }, { sowingDate: "desc" }],
  });
}

export async function listSeasons(tenantId: string): Promise<string[]> {
  const rows = await prisma.campaign.findMany({ where: { tenantId }, distinct: ["season"], select: { season: true } });
  return rows.map((r) => r.season).sort().reverse();
}

export async function findCampaign(tenantId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id, tenantId }, include: CAMPAIGN_INCLUDE });
  if (!campaign) notFound("Campaña no encontrada");
  return campaign;
}

export async function createCampaign(tenantId: string, input: CreateCampaignInput) {
  const pasture = await prisma.pasture.findFirst({ where: { id: input.pastureId, tenantId } });
  if (!pasture) notFound("Lote no encontrado");
  const sowingDay = input.sowingDate ?? todayInArgentina(new Date());
  return prisma.campaign.create({
    data: {
      tenantId,
      pastureId: input.pastureId,
      crop: input.crop,
      season: seasonOf(sowingDay),
      hectares: input.hectares ?? pasture.hectares,
      sowingDate: dayDate(sowingDay),
      referencePrice: input.referencePrice,
      notes: input.notes,
    },
  });
}

export async function updateCampaign(tenantId: string, id: string, input: UpdateCampaignInput) {
  await findCampaign(tenantId, id);
  return prisma.campaign.update({
    where: { id },
    data: {
      crop: input.crop,
      hectares: input.hectares,
      ...(input.sowingDate ? { sowingDate: dayDate(input.sowingDate), season: seasonOf(input.sowingDate) } : {}),
      referencePrice: input.referencePrice,
      notes: input.notes,
      status: input.status,
    },
  });
}

export async function deleteCampaign(tenantId: string, id: string) {
  await findCampaign(tenantId, id);
  await prisma.campaign.delete({ where: { id } });
}
