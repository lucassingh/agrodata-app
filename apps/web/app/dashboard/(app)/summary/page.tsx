import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { findUserTenants, getDashboardSummary, getFieldAlerts, getSignature } from "@repo/core";
import { SummaryClient } from "./summary-client";
import { ZERO_DASHBOARD } from "./types";

export const metadata: Metadata = {
  title: "Resumen — AgroData",
};

interface SummaryPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function SummaryPage({ searchParams }: SummaryPageProps) {
  const user = await requireUser();
  const { from = "", to = "" } = await searchParams;

  const [dashboard, memberships, signature, alerts] = await Promise.all([
    user.activeTenantId ? getDashboardSummary(user.activeTenantId, { from, to }) : ZERO_DASHBOARD,
    findUserTenants(user.id),
    getSignature(user.id),
    user.activeTenantId ? getFieldAlerts(user.activeTenantId) : [],
  ]);
  const active = memberships.find((m) => m.tenantId === user.activeTenantId);

  return (
    <SummaryClient
      dashboard={dashboard}
      hasActiveTenant={Boolean(user.activeTenantId)}
      from={from}
      to={to}
      report={active ? { tenantId: active.tenantId, tenantName: active.tenant.name, signature } : null}
      alerts={alerts}
      canConfigureAlerts={user.fieldRole === "OWNER" || user.fieldRole === "ADMIN" || user.isSuperAdmin}
    />
  );
}
