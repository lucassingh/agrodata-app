"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import type { PlanType } from "@repo/core/billing/plans";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requestPlanAction } from "./actions";

export interface PlanCard {
  id: PlanType;
  name: string;
  audience: string;
  monthlyUsd: number | null;
  features: string[];
  highlighted: boolean;
}

interface PlanCardsProps {
  plans: PlanCard[];
  /** El plan pago vigente, si hay. */
  currentPlan: PlanType | null;
  requestedPlan: PlanType | null;
  /** El plan de la prueba gratis, mientras está vigente. */
  trialPlan: PlanType | null;
}

export function PlanCards({ plans, currentPlan, requestedPlan, trialPlan }: PlanCardsProps) {
  const [pending, startTransition] = useTransition();
  const [requested, setRequested] = useState(requestedPlan);

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

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {plans.map((plan) => {
        const isCurrent = currentPlan === plan.id;
        const isRequested = requested === plan.id;
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

            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

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
          </section>
        );
      })}
    </div>
  );
}
