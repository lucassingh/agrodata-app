import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getPortfolio, getSignature } from "@repo/core";
import { HeroBanner } from "@/components/hero-banner";
import { PortfolioClient } from "./portfolio-client";

export const metadata: Metadata = {
  title: "Cartera — campIA",
};

export default async function PortfolioPage() {
  const user = await requireUser();
  const [fields, signature] = await Promise.all([getPortfolio(user.id), getSignature(user.id)]);

  return (
    <div className="space-y-6">
      <HeroBanner
        title="Cartera"
        subtitle="Todos tus campos en un solo lugar: márgenes, kilos, litros y lo que está por vencer."
      />
      <PortfolioClient
        fields={fields.map((f) => ({ ...f, lastEntryAt: f.lastEntryAt?.toISOString() ?? null }))}
        activeTenantId={user.activeTenantId}
        signature={signature}
      />
    </div>
  );
}
