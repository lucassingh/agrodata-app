"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Check, CheckCheck } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { PROFILES } from "./content";
import { Container, SectionTitle } from "./primitives";
import { useTabKeys } from "./use-tab-keys";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type ProfileId = (typeof PROFILES.items)[number]["id"];

export function Profiles() {
  const [activeId, setActiveId] = useState<ProfileId>(PROFILES.items[0]!.id);
  const reduceMotion = usePrefersReducedMotion();
  const baseId = useId();
  const profile = PROFILES.items.find((item) => item.id === activeId) ?? PROFILES.items[0]!;

  const onKeyDown = useTabKeys({
    ids: PROFILES.items.map((item) => item.id),
    activeId,
    onChange: setActiveId,
    tabDomId: (id) => `${baseId}-tab-${id}`,
    orientation: "vertical",
  });

  return (
    <section id="para-quien" aria-labelledby="perfiles-title" className="scroll-mt-20 py-28 lg:py-36">
      <Container>
        <SectionTitle id="perfiles-title" className="max-w-[16ch]">
          {PROFILES.title}
        </SectionTitle>

        <div className="mt-14 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div
            role="tablist"
            aria-label="Perfiles"
            aria-orientation="vertical"
            onKeyDown={onKeyDown}
            className="flex gap-2 overflow-x-auto lg:col-span-3 lg:flex-col lg:overflow-visible"
          >
            {PROFILES.items.map((item) => {
              const selected = item.id === activeId;
              return (
                <button
                  key={item.id}
                  id={`${baseId}-tab-${item.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveId(item.id)}
                  className={cn(
                    "shrink-0 rounded-full px-5 py-3 text-left font-heading text-lg font-semibold transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-l-brand-light/60 lg:rounded-[16px] lg:px-6 lg:py-5 lg:text-2xl",
                    selected ? "bg-l-brand text-white" : "text-l-ink-soft hover:bg-l-surface hover:text-l-ink",
                  )}
                >
                  {item.name}
                </button>
              );
            })}
          </div>

          <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${profile.id}`} className="lg:col-span-9">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={profile.id}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="grid gap-8 md:grid-cols-2 md:gap-10"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-[16px] bg-l-surface-2 md:aspect-auto md:min-h-[480px]">
                  <Image
                    src={profile.image.src}
                    alt={profile.image.alt}
                    fill
                    sizes="(min-width: 1024px) 36vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-x-4 bottom-4 ml-auto w-fit max-w-[88%] rounded-[12px] rounded-tr-sm bg-l-wa-out px-4 py-3 text-[15px] leading-snug text-l-ink shadow-l">
                    {profile.sampleMessage}
                    <span className="mt-1 flex items-center justify-end gap-1 text-[11px] text-l-ink-soft">
                      por WhatsApp <CheckCheck className="size-3.5 text-[#53bdeb]" aria-hidden />
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <h3 className="font-heading text-[clamp(1.75rem,2.6vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.02em] text-l-ink">
                    {profile.headline}
                  </h3>
                  <p className="mt-4 max-w-[44ch] text-lg leading-relaxed text-l-ink-soft">{profile.body}</p>
                  <ul className="mt-8 grid gap-4">
                    {profile.points.map((point) => (
                      <li key={point} className="flex gap-3 text-l-ink">
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-l-brand-tint text-l-brand">
                          <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </section>
  );
}
