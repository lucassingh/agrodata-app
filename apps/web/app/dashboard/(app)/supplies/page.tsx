import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { listSupplies, listSupplyCategories } from "@repo/core";
import { HeroBanner } from "@/components/hero-banner";
import { SuppliesClient } from "./supplies-client";

export const metadata: Metadata = {
  title: "Insumos — AgroData",
};

export default async function SuppliesPage() {
  const user = await requireUser();

  const [supplies, categories] = user.activeTenantId
    ? await Promise.all([
        listSupplies(user.activeTenantId),
        listSupplyCategories(user.activeTenantId),
      ])
    : [[], []];

  const canEdit = user.platformRole !== "OPERATOR";
  const canDelete = user.capabilities.canDeleteOperationalData;

  return (
    <div className="space-y-6">
      <HeroBanner
        title="Insumos"
        subtitle="Gestión de stock: alimentos, sanidad, fertilizantes y más."
      />
      <SuppliesClient
        supplies={supplies}
        categories={categories}
        hasActiveTenant={Boolean(user.activeTenantId)}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
