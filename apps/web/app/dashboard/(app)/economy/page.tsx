import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getEconomyOverview, listPastures, listSeasons, listUnassignedIncomes } from "@repo/core";
import { HeroBanner } from "@/components/hero-banner";
import { EconomyClient } from "./economy-client";

export const metadata: Metadata = {
  title: "Economía — AgroData",
};

interface EconomyPageProps {
  searchParams: Promise<{ season?: string }>;
}

export default async function EconomyPage({ searchParams }: EconomyPageProps) {
  const user = await requireUser();
  const { season } = await searchParams;
  const tenantId = user.activeTenantId;

  const [overview, seasons, pastures, unassigned] = tenantId
    ? await Promise.all([
        getEconomyOverview(tenantId, season || undefined),
        listSeasons(tenantId),
        listPastures(tenantId),
        listUnassignedIncomes(tenantId),
      ])
    : [null, [], [], []];

  return (
    <div className="space-y-6">
      <HeroBanner
        title="Economía"
        subtitle="Cuánto te dejó cada lote: costos directos, rinde y margen bruto por campaña."
      />
      <EconomyClient
        overview={overview}
        seasons={seasons}
        season={season ?? ""}
        pastures={pastures.map((p) => ({ id: p.id, name: p.name, hectares: p.hectares }))}
        unassignedIncomes={unassigned.map((i) => ({
          id: i.id,
          date: i.date.toISOString().slice(0, 10),
          crop: i.crop,
          amount: i.amount,
          currency: i.currency,
          counterparty: i.counterparty,
        }))}
        canEdit={user.platformRole !== "OPERATOR"}
        canDelete={user.capabilities.canDeleteOperationalData}
      />
    </div>
  );
}
