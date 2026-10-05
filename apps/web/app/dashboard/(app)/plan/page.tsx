import type { Metadata } from "next";
import {
  checkoutQuote,
  getMyPlan,
  listMyPayments,
  officialUsdRate,
  PAYMENT_PERIODS,
  PERIOD_LABEL,
  PLANS,
  TRIAL_DAYS,
  type PaymentPeriod,
  type PlanType,
} from "@repo/core";
import { requireUser } from "@/lib/session";
import { isPaymentSandbox, paymentsEnabled } from "@/lib/payments";
import { HeroBanner } from "@/components/hero-banner";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PRICING } from "@/components/landing/content";
import { cn } from "@/lib/utils";
import { PlanCards, type PlanCard, type PlanPayments } from "./plan-cards";
import { RefreshPaymentButton } from "./refresh-payment-button";

export const metadata: Metadata = {
  title: "Mi plan — campIA",
};

/** Día argentino, sin hora (se arma en el servidor: no hay hidratación). */
const formatDay = (date: Date) =>
  date.toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });

/** Día de una cotización (`2026-09-30`), que es de solo fecha. */
const formatRateDay = (day: string) => `${Number(day.slice(8, 10))}/${Number(day.slice(5, 7))}`;

const pesos = (amount: number) => `$ ${Math.round(amount).toLocaleString("es-AR")}`;

const STATUS_LABEL = { APPROVED: "Aprobado", REJECTED: "Rechazado", CANCELLED: "Cancelado", PENDING: "Pendiente" } as const;

interface PlanPageProps {
  searchParams: Promise<{ pago?: string }>;
}

export default async function PlanPage({ searchParams }: PlanPageProps) {
  const user = await requireUser();
  const { pago } = await searchParams;
  const enabled = paymentsEnabled();
  const [{ state, requestedPlan, requestedAt, fields }, payments, rate] = await Promise.all([
    getMyPlan(user.id),
    enabled ? listMyPayments(user.id) : Promise.resolve([]),
    enabled ? officialUsdRate() : Promise.resolve(null),
  ]);

  const plans: PlanCard[] = PRICING.plans.map((p) => {
    const id = p.id.toUpperCase() as PlanType;
    return { id, name: PLANS[id].name, audience: PLANS[id].audience, monthlyUsd: PLANS[id].monthlyUsd, features: p.features, highlighted: p.highlighted };
  });

  // Precio en pesos de cada plan y período, al dólar oficial de hoy.
  const checkout: PlanPayments | null =
    enabled && rate
      ? {
          rateLabel: `dólar oficial del ${formatRateDay(rate.day)}: ${pesos(rate.sell)}`,
          sandbox: isPaymentSandbox(),
          prices: Object.fromEntries(
            plans.map((p) => [
              p.id,
              Object.fromEntries(PAYMENT_PERIODS.map((m) => [m, checkoutQuote(p.id, m, rate.sell)?.amountArs ?? null])),
            ]),
          ) as PlanPayments["prices"],
        }
      : null;

  const returned = pago ? payments.find((p) => p.id === pago) : undefined;

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

  type PaymentRow = (typeof payments)[number];
  const paymentColumns: DataTableColumn<PaymentRow>[] = [
    { key: "date", label: "Fecha", className: "whitespace-nowrap", render: (p) => formatDay(p.createdAt) },
    { key: "plan", label: "Plan", render: (p) => `${PLANS[p.plan].name}, ${PERIOD_LABEL[p.months as PaymentPeriod] ?? `${p.months} meses`}` },
    { key: "amount", label: "Monto", className: "whitespace-nowrap text-right", render: (p) => pesos(p.amountArs) },
    {
      key: "status",
      label: "Estado",
      render: (p) =>
        p.status === "PENDING" ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{p.mpPaymentId ? "Pendiente de acreditación" : "Sin completar"}</span>
            <RefreshPaymentButton paymentId={p.id} />
          </div>
        ) : (
          <span className={cn("text-sm font-medium", p.status === "APPROVED" ? "text-primary" : "text-[#8A5A12]")}>{STATUS_LABEL[p.status]}</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <HeroBanner
        title="Mi plan"
        subtitle="El plan es tuyo: cubre los campos donde sos dueño o asesor. Un campo funciona si lo cubre el plan de alguien que lo administra."
      />

      {returned ? <ReturnNotice status={returned.status} hasMpPayment={Boolean(returned.mpPaymentId)} /> : null}

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
        checkout={checkout}
      />
      <p className="text-xs text-muted-foreground">
        {checkout
          ? `Precios en dólares por mes; se cobran en pesos al ${checkout.rateLabel}. El pago lo procesa Mercado Pago (tarjeta, dinero en cuenta o efectivo). Sin débito automático: cuando vence, lo renovás desde acá, y si renovás el mismo plan antes de que venza no perdés días.`
          : "Precios en dólares por mes; se cobran en pesos al dólar oficial del día. Por ahora el plan lo activamos nosotros después del pago; pronto vas a poder pagar con Mercado Pago desde acá."}
      </p>

      {enabled && payments.length > 0 ? (
        <section aria-labelledby="pagos-title" className="space-y-3">
          <h2 id="pagos-title" className="font-heading text-lg font-bold">
            Tus pagos
          </h2>
          <DataTable rows={payments} columns={paymentColumns} />
        </section>
      ) : null}

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

/** Lo que pasó con el pago al volver de Mercado Pago. */
function ReturnNotice({ status, hasMpPayment }: { status: keyof typeof STATUS_LABEL; hasMpPayment: boolean }) {
  const content =
    status === "APPROVED"
      ? { tone: "bg-accent text-primary-dark", text: "Listo: recibimos tu pago y tu plan ya está activo." }
      : status === "PENDING"
        ? {
            tone: "bg-[#FDF4E3] text-[#6B4510]",
            text: hasMpPayment
              ? "Tu pago quedó pendiente (por ejemplo, si elegiste pagar en efectivo). El plan se activa cuando Mercado Pago lo acredite; podés revisarlo abajo, en Tus pagos."
              : "Todavía no vemos el pago. Si ya pagaste, tocá «Ya pagué: revisar» en Tus pagos.",
          }
        : { tone: "bg-[#FDF4E3] text-[#6B4510]", text: "El pago no se hizo. Podés probar de nuevo, con otra tarjeta u otro medio." };
  return (
    <p role="status" className={cn("rounded-xl px-4 py-3 text-sm font-medium", content.tone)}>
      {content.text}
    </p>
  );
}
