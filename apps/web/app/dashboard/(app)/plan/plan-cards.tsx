"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import type { PlanType } from "@repo/core/billing/plans";
import { PAYMENT_PERIODS, PERIOD_LABEL, type PaymentPeriod } from "@repo/core/billing/checkout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requestPlanAction, startCheckoutAction } from "./actions";

export interface PlanCard {
  id: PlanType;
  name: string;
  audience: string;
  monthlyUsd: number | null;
  features: string[];
  highlighted: boolean;
}

/** Con Mercado Pago prendido: el precio en pesos de cada plan y período. */
export interface PlanPayments {
  rateLabel: string;
  /** Credenciales de prueba: se paga con un comprador y una tarjeta de prueba. */
  sandbox: boolean;
  prices: Record<PlanType, Record<PaymentPeriod, number | null>>;
}

interface PlanCardsProps {
  plans: PlanCard[];
  /** El plan pago vigente, si hay. */
  currentPlan: PlanType | null;
  requestedPlan: PlanType | null;
  /** El plan de la prueba gratis, mientras está vigente. */
  trialPlan: PlanType | null;
  checkout: PlanPayments | null;
}

const pesos = (amount: number) => `$ ${amount.toLocaleString("es-AR")}`;

export function PlanCards({ plans, currentPlan, requestedPlan, trialPlan, checkout }: PlanCardsProps) {
  const [pending, startTransition] = useTransition();
  const [requested, setRequested] = useState(requestedPlan);
  const [period, setPeriod] = useState<PaymentPeriod>(1);
  const [paying, setPaying] = useState<PlanType | null>(null);

  const request = (plan: PlanCard) =>
    startTransition(async () => {
      const result = await requestPlanAction(plan.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setRequested(plan.id);
      toast.success(`Listo: te escribimos para activar el plan ${plan.name}.`);
    });

  const pay = (plan: PlanCard) => {
    setPaying(plan.id);
    startTransition(async () => {
      const result = await startCheckoutAction(plan.id, period);
      if (!result.success) {
        toast.error(result.error);
        setPaying(null);
        return;
      }
      window.location.assign(result.url);
    });
  };

  return (
    <div className="space-y-4">
      {checkout ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="radiogroup" aria-label="Período a pagar" className="flex w-fit gap-1 rounded-xl border border-border bg-card p-1 shadow-soft">
            {PAYMENT_PERIODS.map((months) => (
              <button
                key={months}
                type="button"
                role="radio"
                aria-checked={period === months}
                onClick={() => setPeriod(months)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                  period === months ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {PERIOD_LABEL[months]}
                {months === 12 ? <span className="ml-1 text-xs opacity-80">(2 de regalo)</span> : null}
              </button>
            ))}
          </div>
          {checkout.sandbox ? (
            <p className="rounded-lg bg-[#FDF4E3] px-3 py-1.5 text-xs font-medium text-[#6B4510]">
              Pagos de prueba: se paga con un comprador y una tarjeta de prueba de Mercado Pago.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isRequested = requested === plan.id;
          const price = checkout?.prices[plan.id]?.[period] ?? null;
          return (
            <section
              key={plan.id}
              aria-labelledby={`plan-${plan.id}`}
              className={cn(
                "flex flex-col rounded-2xl border bg-card p-5 shadow-soft",
                plan.highlighted ? "border-primary ring-1 ring-primary" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 id={`plan-${plan.id}`} className="font-heading text-lg font-bold">
                    {plan.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{plan.audience}</p>
                </div>
                {isCurrent ? (
                  <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-primary-foreground">Tu plan</span>
                ) : trialPlan === plan.id ? (
                  <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-primary-dark">Tu prueba</span>
                ) : null}
              </div>

              <p className="mt-4">
                {plan.monthlyUsd === null ? (
                  <span className="font-heading text-2xl font-bold">A medida</span>
                ) : (
                  <>
                    <span className="font-heading text-3xl font-bold">US$ {plan.monthlyUsd}</span>
                    <span className="text-sm text-muted-foreground"> por mes</span>
                  </>
                )}
              </p>
              {price !== null ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Hoy: <strong className="font-semibold text-foreground">{pesos(price)}</strong> por {PERIOD_LABEL[period]}
                </p>
              ) : null}

              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {price !== null ? (
                <Button className="mt-5 w-full" variant={plan.highlighted ? "default" : "outline"} disabled={pending} onClick={() => pay(plan)}>
                  {paying === plan.id ? "Yendo a Mercado Pago…" : isCurrent ? "Renovar con Mercado Pago" : "Pagar con Mercado Pago"}
                </Button>
              ) : (
                <Button
                  className="mt-5 w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  disabled={pending || isRequested || isCurrent}
                  onClick={() => request(plan)}
                >
                  {isCurrent
                    ? "Es tu plan"
                    : isRequested
                      ? "Pedido: te escribimos"
                      : plan.monthlyUsd === null
                        ? "Hablemos"
                        : "Quiero este plan"}
                </Button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
