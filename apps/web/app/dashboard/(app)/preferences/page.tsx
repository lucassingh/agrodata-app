import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { findUserTenants, getAllPreferences, listExpenseCategories } from "@repo/core";
import { HeroBanner } from "@/components/hero-banner";
import { PreferencesTabs } from "./preferences-tabs";

export const metadata: Metadata = {
  title: "Preferencias — AgroData",
};

export default async function PreferencesPage() {
  const user = await requireUser();
  const memberships = await findUserTenants(user.id);

  const [preferences, expenseCategories] = user.activeTenantId
    ? await Promise.all([
        getAllPreferences(user.activeTenantId),
        listExpenseCategories(user.activeTenantId),
      ])
    : [
        { animalCategories: [], rodeos: [], cropConfigs: [], supplyCategories: [] },
        [],
      ];

  const canManage = user.platformRole !== "OPERATOR";
  const canDelete = user.capabilities.canDeleteOperationalData;

  return (
    <div className="space-y-6">
      <HeroBanner
        title="Preferencias"
        subtitle="Configurá tus campos y las listas que usan Potreros, Tareas, Insumos y Gastos."
      />

      <PreferencesTabs
        memberships={memberships.map((m) => ({
          tenantId: m.tenantId,
          role: m.role,
          tenant: {
            id: m.tenant.id,
            name: m.tenant.name,
            category: m.tenant.category,
            timezone: m.tenant.timezone,
            baseCurrency: m.tenant.baseCurrency,
            location: m.tenant.location,
            totalHa: m.tenant.totalHa,
          },
        }))}
        activeTenantId={user.activeTenantId}
        isOwner={user.isSuperAdmin}
        canManage={canManage}
        canDelete={canDelete}
        animalCategories={preferences.animalCategories}
        cropConfigs={preferences.cropConfigs}
        supplyCategories={preferences.supplyCategories}
        rodeos={preferences.rodeos}
        expenseCategories={expenseCategories.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
        }))}
      />
    </div>
  );
}
