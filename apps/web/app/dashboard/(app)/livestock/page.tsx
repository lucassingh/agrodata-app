import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getAllPreferences, getLivestockGroups, getReproSeasons, listPastures, listRodeos } from "@repo/core";
import { HeroBanner } from "@/components/hero-banner";
import { LivestockClient } from "./livestock-client";

export const metadata: Metadata = {
  title: "Ganadería — AgroData",
};

export default async function LivestockPage() {
  const user = await requireUser();
  const tenantId = user.activeTenantId;
  const [groups, pastures, preferences, seasons, rodeos] = tenantId
    ? await Promise.all([
        getLivestockGroups(tenantId),
        listPastures(tenantId),
        getAllPreferences(tenantId),
        getReproSeasons(tenantId),
        listRodeos(tenantId),
      ])
    : [null, [], { animalCategories: [] as { name: string }[] }, [], []];

  const categories = [
    ...new Set([
      ...preferences.animalCategories.map((c) => c.name),
      ...pastures.flatMap((p) => p.animals.map((a) => a.animalType)),
    ]),
  ].sort();

  return (
    <div className="space-y-6">
      <HeroBanner title="Ganadería" subtitle="Pesadas, aumento diario de peso y carga de cada potrero o corral." />
      <LivestockClient
        groups={groups}
        pastures={pastures.map((p) => ({ id: p.id, name: p.name }))}
        categories={categories}
        seasons={seasons}
        rodeos={rodeos.map((r) => ({ id: r.id, name: r.name }))}
        canEdit={user.platformRole !== "OPERATOR"}
      />
    </div>
  );
}
