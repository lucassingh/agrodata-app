"use client";

import dynamic from "next/dynamic";

import { Globe, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { MULTI_FIELD } from "./content";
import { Container, SectionTitle } from "./primitives";
import { useMediaQuery } from "@/lib/use-media-query";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

const MultiFieldScene = dynamic(() => import("./multi-field-scene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 animate-pulse bg-l-surface-2/60" aria-hidden />,
});

const AUTO_CYCLE_MS = 5000;

export function MultiField() {
  const reduceMotion = Boolean(usePrefersReducedMotion());
  const isMd = useMediaQuery("(min-width: 768px)");
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
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
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
            <div className="relative overflow-hidden rounded-[16px] bg-[#eef3ef] p-3 pb-16 md:h-[clamp(360px,52vw,600px)] md:p-0">
              {/* En celular la escena 3D cortaba las etiquetas: una grilla simple, sin bajar three.js. */}
              {isMd ? (
                <MultiFieldScene fields={MULTI_FIELD.fields} activeFieldIds={role.fields} reduceMotion={reduceMotion} />
              ) : (
                <FieldGrid fields={MULTI_FIELD.fields} activeFieldIds={role.fields} />
              )}
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

/** Los mismos colores de cultivo que la escena 3D (multi-field-scene.tsx). */
const CROP_COLORS = ["#7fae6e", "#a9c46c", "#d6c07d", "#93b98a", "#b9a27c", "#6e9e68"];

/**
 * Los cuatro campos vistos desde arriba, separados por caminos: los del rol
 * elegido quedan con su color y el borde ámbar; los demás, apagados.
 */
function FieldGrid({ fields, activeFieldIds }: { fields: { id: string; name: string }[]; activeFieldIds: string[] }) {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-2 rounded-[12px] bg-[#ddd5c1] p-2 md:hidden">
      {fields.map((field, fieldIndex) => {
        const active = activeFieldIds.includes(field.id);
        return (
          <div
            key={field.id}
            className={cn(
              "relative aspect-square overflow-hidden rounded-[6px] transition-[opacity,filter] duration-500 motion-reduce:transition-none",
              active ? "opacity-100" : "opacity-45 grayscale",
            )}
          >
            <div className="grid size-full grid-cols-3 grid-rows-2 gap-[2px] bg-white/45">
              {Array.from({ length: 6 }, (_, cell) => (
                <span
                  key={cell}
                  style={{ backgroundColor: CROP_COLORS[(fieldIndex * 5 + (cell % 3) * 2 + Math.floor(cell / 3) * 3) % CROP_COLORS.length] }}
                />
              ))}
            </div>
            <span
              className={cn(
                "absolute inset-0 rounded-[6px] ring-3 ring-[#e0a21a] ring-inset transition-opacity duration-500 motion-reduce:transition-none",
                active ? "opacity-100" : "opacity-0",
              )}
            />
            <span
              className={cn(
                "absolute top-2 left-2 rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap shadow-l transition-colors duration-300",
                active ? "bg-l-ink text-white" : "bg-white text-l-ink",
              )}
            >
              {field.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
