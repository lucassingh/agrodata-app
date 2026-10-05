import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import {
  DEFAULT_ALERT_SETTINGS,
  findUserTenants,
  getAlertSettings,
  getAllPreferences,
  getMemberAlertPreference,
  listExpenseCategories,
  type FieldRole,
} from "@repo/core";
import { HeroBanner } from "@/components/hero-banner";
import { PreferencesTabs } from "./preferences-tabs";

export const metadata: Metadata = {
  title: "Preferencias — campIA",
};

interface PreferencesPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function PreferencesPage({ searchParams }: PreferencesPageProps) {
  const user = await requireUser();
  const { tab } = await searchParams;
  const memberships = await findUserTenants(user.id);

  const [preferences, expenseCategories, alertSettings, alertPreference] = user.activeTenantId
    ? await Promise.all([
        getAllPreferences(user.activeTenantId),
        listExpenseCategories(user.activeTenantId),
        getAlertSettings(user.activeTenantId),
        getMemberAlertPreference(user.id, user.activeTenantId),
      ])
    : [
        { animalCategories: [], rodeos: [], cropConfigs: [], supplyCategories: [] },
        [],
        DEFAULT_ALERT_SETTINGS,
        { whatsappAlerts: false, hasWhatsapp: false },
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
          role: m.role as FieldRole,
          tenant: {
            id: m.tenant.id,
            name: m.tenant.name,
            category: m.tenant.category,
            activities: m.tenant.activities,
            timezone: m.tenant.timezone,
            baseCurrency: m.tenant.baseCurrency,
            exchangeRateKind: m.tenant.exchangeRateKind,
            vatCondition: m.tenant.vatCondition,
            location: m.tenant.location,
            totalHa: m.tenant.totalHa,
          },
        }))}
        activeTenantId={user.activeTenantId}
        defaultTab={tab}
        alerts={{
          settings: alertSettings,
          canConfigure: user.isSuperAdmin || user.fieldRole === "OWNER" || user.fieldRole === "ADMIN",
          whatsappAlerts: alertPreference.whatsappAlerts,
          hasWhatsapp: alertPreference.hasWhatsapp,
        }}
        canEditField={user.capabilities.canUpdateField}
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
