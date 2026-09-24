"use client";

import dynamic from "next/dynamic";

import { Globe, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { MULTI_FIELD } from "./content";
import { Container, SectionTitle } from "./primitives";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

const MultiFieldScene = dynamic(() => import("./multi-field-scene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 animate-pulse bg-l-surface-2/60" aria-hidden />,
});

const AUTO_CYCLE_MS = 5000;

export function MultiField() {
  const reduceMotion = Boolean(usePrefersReducedMotion());
  const [roleIndex, setRoleIndex] = useState(0);
  const [autoCycle, setAutoCycle] = useState(true);
  const role = MULTI_FIELD.roles[roleIndex] ?? MULTI_FIELD.roles[0]!;

  // Recorre los roles solo mientras nadie eligió uno a mano.
  useEffect(() => {
    if (!autoCycle || reduceMotion) return;
    const timer = setTimeout(() => setRoleIndex((i) => (i + 1) % MULTI_FIELD.roles.length), AUTO_CYCLE_MS);
    return () => clearTimeout(timer);
  }, [roleIndex, autoCycle, reduceMotion]);

  const selectRole = (index: number) => {
    setAutoCycle(false);
    setRoleIndex(index);
  };

  return (
    <section aria-labelledby="multicampo-title" className="overflow-hidden bg-l-surface py-28 lg:py-36">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <SectionTitle id="multicampo-title" className="max-w-[14ch]">
              {MULTI_FIELD.title}
            </SectionTitle>
            <p className="mt-5 max-w-[40ch] text-lg leading-relaxed text-l-ink-soft">{MULTI_FIELD.body}</p>

            <div role="radiogroup" aria-label="Elegí un rol para ver a qué campos accede" className="mt-10 grid gap-2">
              {MULTI_FIELD.roles.map((item, index) => {
                const selected = index === roleIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => selectRole(index)}
                    className={cn(
                      "rounded-[16px] p-4 text-left transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-l-brand-light/60",
                      selected ? "bg-white shadow-l" : "hover:bg-white/60",
                    )}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className={cn("font-heading text-lg font-semibold", selected ? "text-l-ink" : "text-l-ink-soft")}>
                        {item.name}
                      </span>
                      <span
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                          item.channel === "Solo WhatsApp" ? "bg-l-wa-out text-l-brand-dark" : "bg-l-brand-tint text-l-brand-dark",
                        )}
                      >
                        {item.channel === "Solo WhatsApp" ? (
                          <MessageCircle className="size-3.5" aria-hidden />
                        ) : (
                          <Globe className="size-3.5" aria-hidden />
                        )}
                        {item.channel}
                      </span>
                    </span>
                    <span className={cn("mt-1 block text-[15px] leading-snug", selected ? "text-l-ink-soft" : "text-l-ink-soft/75")}>
                      {item.summary}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="relative h-[clamp(360px,52vw,600px)] overflow-hidden rounded-[16px] bg-[#eef3ef]">
              <MultiFieldScene fields={MULTI_FIELD.fields} activeFieldIds={role.fields} reduceMotion={reduceMotion} />
              <p aria-live={autoCycle ? "off" : "polite"} className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-2 text-sm text-l-ink shadow-l">
                <span className="font-semibold">{role.name}:</span> {role.fields.length === MULTI_FIELD.fields.length ? "todos los campos" : `${role.fields.length} de ${MULTI_FIELD.fields.length} campos`}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
