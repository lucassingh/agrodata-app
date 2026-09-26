import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getDairyOverview } from "@repo/core";
import { HeroBanner } from "@/components/hero-banner";
import { DairyClient } from "./dairy-client";

export const metadata: Metadata = {
  title: "Tambo — AgroData",
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function argentinaDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(date);
}

interface DairyPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function DairyPage({ searchParams }: DairyPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  // Por defecto, los últimos 30 días.
  const to = params.to && DAY.test(params.to) ? params.to : argentinaDay(new Date());
  const from =
    params.from && DAY.test(params.from) ? params.from : argentinaDay(new Date(Date.parse(`${to}T12:00:00Z`) - 29 * 86_400_000));

  const overview = user.activeTenantId ? await getDairyOverview(user.activeTenantId, { from, to }) : null;

  return (
    <div className="space-y-6">
      <HeroBanner title="Tambo" subtitle="Litros, precio de la leche y margen sobre alimentación por litro." />
      <DairyClient overview={overview} canEdit={user.platformRole !== "OPERATOR"} />
    </div>
  );
}
