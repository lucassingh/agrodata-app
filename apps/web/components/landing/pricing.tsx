"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { CtaLink } from "./cta-link";
import { DEMO_CTA_LABEL, PRICING } from "./content";
import { Container, SectionTitle, SoonBadge, featureLabel, type PlanFeature } from "./primitives";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type Billing = "monthly" | "yearly";

/** Anual = 10 meses pagos (2 de regalo), expresado como precio mensual equivalente. */
function monthlyPrice(monthly: number, billing: Billing) {
  return billing === "monthly" ? monthly : Math.round((monthly * 10) / 12);
}

export function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const reduceMotion = usePrefersReducedMotion();
  const toggleId = useId();

  return (
    <section id="precios" aria-labelledby="precios-title" className="scroll-mt-20 bg-l-surface py-28 lg:py-36">
      <Container>
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <SectionTitle id="precios-title">{PRICING.title}</SectionTitle>
            <p className="mt-4 text-lg text-l-ink-soft">{PRICING.subtitle}</p>
          </div>

          <div role="radiogroup" aria-label="Frecuencia de pago" className="flex w-fit rounded-full bg-white p-1 shadow-l">
            {(["monthly", "yearly"] as const).map((option) => {
              const selected = billing === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setBilling(option)}
                  className={cn(
                    "relative rounded-full px-5 py-2.5 text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-l-brand-light/60",
                    selected ? "text-white" : "text-l-ink-soft hover:text-l-ink",
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId={`${toggleId}-billing`}
                      className="absolute inset-0 rounded-full bg-l-ink"
                      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative">
                    {option === "monthly" ? "Mensual" : "Anual"}
                    {option === "yearly" && (
                      <span className={cn("ml-2 rounded-full px-2 py-0.5 text-xs", selected ? "bg-l-accent text-l-ink" : "bg-l-accent-tint text-l-ink")}>
                        2 meses gratis
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <ul className="mt-14 grid gap-4 lg:grid-cols-3 lg:items-stretch">
          {PRICING.plans.map((plan) => (
            <li
              key={plan.id}
              className={cn(
                "landing-reveal relative flex flex-col rounded-[16px] p-7 sm:p-8",
                plan.highlighted ? "bg-l-brand-dark text-white lg:-my-4 lg:py-12" : "bg-white text-l-ink shadow-l",
              )}
            >
              {plan.highlighted && (
                <span className="absolute top-7 right-7 rounded-full bg-l-accent px-3 py-1 text-xs font-semibold text-l-ink sm:top-8 sm:right-8">
                  Recomendado
                </span>
              )}
              <h3 className="font-heading text-2xl font-bold">{plan.name}</h3>
              <p className={cn("mt-1", plan.highlighted ? "text-white/75" : "text-l-ink-soft")}>{plan.audience}</p>

              <div className="mt-8 flex h-16 items-end gap-2">
                {plan.monthly === null ? (
                  <p className="font-heading text-4xl font-bold tracking-[-0.02em]">A medida</p>
                ) : (
                  <>
                    <span className={cn("pb-1.5 text-sm font-medium", plan.highlighted ? "text-white/75" : "text-l-ink-soft")}>USD</span>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={`${plan.id}-${billing}`}
                        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        className="font-heading text-6xl leading-none font-bold tracking-[-0.03em] tabular-nums"
                      >
                        {monthlyPrice(plan.monthly, billing)}
                      </motion.span>
                    </AnimatePresence>
                    <span className={cn("pb-1.5 text-sm", plan.highlighted ? "text-white/75" : "text-l-ink-soft")}>
                      / mes{billing === "yearly" && ", pago anual"}
                    </span>
                  </>
                )}
              </div>

              <ul className="mt-8 grid flex-1 content-start gap-3">
                {plan.features.map((feature: PlanFeature) => (
                  <li key={featureLabel(feature)} className="flex gap-3">
                    <Check className={cn("mt-0.5 size-5 shrink-0", plan.highlighted ? "text-l-brand-light" : "text-l-brand")} aria-hidden />
                    <span className={plan.highlighted ? "text-white/90" : "text-l-ink"}>
                      {featureLabel(feature)}
                      {typeof feature !== "string" && feature.soon ? <SoonBadge onDark={plan.highlighted} className="ml-2 align-middle" /> : null}
                    </span>
                  </li>
                ))}
              </ul>

              <CtaLink href="#demo" variant={plan.highlighted ? "onBrand" : "secondary"} size="lg" className="mt-10 w-full">
                {DEMO_CTA_LABEL}
              </CtaLink>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
