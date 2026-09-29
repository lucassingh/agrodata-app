import type { Metadata } from "next";
import { getMyPlan, PLANS, TRIAL_DAYS, type PlanType } from "@repo/core";
import { requireUser } from "@/lib/session";
import { HeroBanner } from "@/components/hero-banner";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PRICING } from "@/components/landing/content";
import { cn } from "@/lib/utils";
import { PlanCards, type PlanCard } from "./plan-cards";

export const metadata: Metadata = {
  title: "Mi plan — AgroData",
};

/** Día argentino, sin hora (se arma en el servidor: no hay hidratación). */
const formatDay = (date: Date) =>
  date.toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });

export default async function PlanPage() {
  const user = await requireUser();
  const { state, requestedPlan, requestedAt, fields } = await getMyPlan(user.id);

  const plans: PlanCard[] = PRICING.plans.map((p) => {
    const id = p.id.toUpperCase() as PlanType;
    return { id, name: PLANS[id].name, audience: PLANS[id].audience, monthlyUsd: PLANS[id].monthlyUsd, features: p.features, highlighted: p.highlighted };
  });

  type Row = (typeof fields)[number];
  const columns: DataTableColumn<Row>[] = [
    { key: "name", label: "Campo", render: (f) => <span className="font-medium">{f.name}</span> },
    { key: "role", label: "Tu rol", render: (f) => f.role },
    {
      key: "access",
      label: "Estado",
      render: (f) => (
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
            f.access === "read-only" ? "bg-[#FDF4E3] text-[#6B4510]" : "bg-accent text-primary-dark",
          )}
        >
          {f.coveredByMe ? "Lo cubre tu plan" : f.access === "active" ? "Lo cubre el plan de otra persona" : "Modo lectura"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <HeroBanner
        title="Mi plan"
        subtitle="El plan es tuyo: cubre los campos donde sos dueño o asesor. Un campo funciona si lo cubre el plan de alguien que lo administra."
      />

      <section aria-labelledby="estado-title" className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 id="estado-title" className="font-heading text-lg font-bold">
          {state.kind === "paid"
            ? `Plan ${PLANS[state.plan].name}, activo hasta el ${formatDay(state.until)}`
            : state.kind === "trial"
              ? `Prueba gratis: ${state.daysLeft === 1 ? "queda 1 día" : `quedan ${state.daysLeft} días`} (hasta el ${formatDay(state.until)})`
              : "No tenés un plan activo"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {state.kind === "paid"
            ? "Se cobra en pesos, al dólar oficial del día. Sin permanencia."
            : state.kind === "trial"
              ? `Durante ${TRIAL_DAYS} días tenés todo el plan Asesor, sin tarjeta. Cuando termine, tus campos quedan en modo lectura hasta que actives un plan: se pueden ver y exportar, y no se borra nada.`
              : "Tus campos están en modo lectura: podés ver, exportar y pedir informes, pero no cargar datos nuevos. No se borró nada; al activar un plan, todo sigue donde estaba."}
        </p>
        {requestedPlan ? (
          <p className="mt-3 rounded-lg bg-accent px-3 py-2 text-sm text-primary-dark">
            Pediste el plan {PLANS[requestedPlan].name}
            {requestedAt ? ` el ${formatDay(requestedAt)}` : ""}. Te escribimos para activarlo.
          </p>
        ) : null}
      </section>

      <PlanCards
        plans={plans}
        currentPlan={state.kind === "paid" ? state.plan : null}
        requestedPlan={requestedPlan}
        trialPlan={state.kind === "trial" ? state.plan : null}
      />
      <p className="text-xs text-muted-foreground">
        Precios en dólares por mes; se cobran en pesos al dólar oficial del día. Por ahora el plan lo activamos nosotros
        después del pago; pronto vas a poder pagar con Mercado Pago desde acá.
      </p>

      <section aria-labelledby="campos-title" className="space-y-3">
        <h2 id="campos-title" className="font-heading text-lg font-bold">
          Tus campos
        </h2>
        {fields.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            Todavía no tenés campos.
          </p>
        ) : (
          <DataTable rows={fields} columns={columns} />
        )}
      </section>
    </div>
  );
}
