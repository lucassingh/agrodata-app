import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getExpenseDashboard, listExpenseCategories } from "@repo/core";
import { HeroBanner } from "@/components/hero-banner";
import { ExpensesClient } from "./expenses-client";

export const metadata: Metadata = {
  title: "Gastos — AgroData",
};

interface ExpensesPageProps {
  searchParams: Promise<{ currency?: string; from?: string; to?: string }>;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const currency: "ARS" | "USD" = params.currency === "USD" ? "USD" : "ARS";
  const from = params.from ?? "";
  const to = params.to ?? "";

  const [dashboard, categories] = user.activeTenantId
    ? await Promise.all([
        getExpenseDashboard(user.activeTenantId, { currency, from: from || undefined, to: to || undefined }),
        listExpenseCategories(user.activeTenantId),
      ])
    : [
        { totalAmount: 0, byCategory: [], monthlyTrends: [], expenses: [] },
        [],
      ];

  const canEdit = user.platformRole !== "OPERATOR";
  const canDelete = user.capabilities.canDeleteOperationalData;

  return (
    <div className="space-y-6">
      <HeroBanner
        title="Gastos"
        subtitle="Resumen y distribución de gastos del establecimiento."
      />
      <ExpensesClient
        dashboard={dashboard}
        categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
        hasActiveTenant={Boolean(user.activeTenantId)}
        canEdit={canEdit}
        canDelete={canDelete}
        currency={currency}
        from={from}
        to={to}
      />
    </div>
  );
}
