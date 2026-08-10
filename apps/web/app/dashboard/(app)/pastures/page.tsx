import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { listPastures, getAllPreferences } from "@repo/core";
import { HeroBanner } from "@/components/hero-banner";
import { PasturesClient } from "./pastures-client";

export const metadata: Metadata = {
  title: "Potreros — AgroData",
};

interface PasturesPageProps {
  searchParams: Promise<{ create?: string }>;
}

export default async function PasturesPage({ searchParams }: PasturesPageProps) {
  const user = await requireUser();
  const { create } = await searchParams;

  const [pastures, preferences] = user.activeTenantId
    ? await Promise.all([listPastures(user.activeTenantId), getAllPreferences(user.activeTenantId)])
    : [[], { animalCategories: [], cropConfigs: [] }];

  return (
    <div className="space-y-6">
      <HeroBanner title="Potreros" subtitle="Lotes del campo, con sus cultivos y animales asociados." />
      <PasturesClient
        pastures={pastures}
        cropOptions={preferences.cropConfigs.map((c) => ({ value: c.name, label: c.name }))}
        animalOptions={preferences.animalCategories.map((a) => ({ value: a.name, label: a.name }))}
        hasActiveTenant={Boolean(user.activeTenantId)}
        autoCreate={create === "1"}
      />
    </div>
  );
}
