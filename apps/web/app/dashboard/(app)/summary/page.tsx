import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getDashboardSummary } from "@repo/core";
import { SummaryClient } from "./summary-client";
import { ZERO_DASHBOARD } from "./types";

export const metadata: Metadata = {
  title: "Resumen — AgroData",
};

export default async function SummaryPage() {
  const user = await requireUser();

  const dashboard = user.activeTenantId
    ? await getDashboardSummary(user.activeTenantId)
    : ZERO_DASHBOARD;

  return <SummaryClient dashboard={dashboard} hasActiveTenant={Boolean(user.activeTenantId)} />;
}
