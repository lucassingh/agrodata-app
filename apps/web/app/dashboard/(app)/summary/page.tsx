import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getDashboardSummary } from "@repo/core";
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

  const dashboard = user.activeTenantId
    ? await getDashboardSummary(user.activeTenantId, { from, to })
    : ZERO_DASHBOARD;

  return (
    <SummaryClient dashboard={dashboard} hasActiveTenant={Boolean(user.activeTenantId)} from={from} to={to} />
  );
}
