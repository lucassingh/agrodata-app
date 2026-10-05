"use client";

import Image from "next/image";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { ClipboardList, Database, DollarSign, Fence, Milk, Package, PieChart, Scale, type LucideIcon } from "lucide-react";
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SHOWCASE } from "./content";
import { Container, SectionTitle } from "./primitives";
import { useTabKeys } from "./use-tab-keys";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

const TAB_ICONS: Record<string, LucideIcon> = {
  resumen: PieChart,
  datos: Database,
  potreros: Fence,
  tareas: ClipboardList,
  gastos: DollarSign,
  insumos: Package,
  ganaderia: Scale,
  tambo: Milk,
};

/**
 * Tabs con capturas reales del dashboard (2400x1500, 16:10), sacadas de la
 * cuenta demo de develop (`pnpm --filter @repo/database db:seed:demo`, ver
 * docs/17). Para actualizarlas, se vuelven a sacar con el mismo tamaño.
 */
export function ProductShowcase() {
  const [activeId, setActiveId] = useState(SHOWCASE.tabs[0]!.id);
  const reduceMotion = usePrefersReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const { scrollYProgress } = useScroll({ target: frameRef, offset: ["start end", "center center"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [14, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);

  const active = SHOWCASE.tabs.find((tab) => tab.id === activeId) ?? SHOWCASE.tabs[0]!;

  const onTabKeyDown = useTabKeys({
    ids: SHOWCASE.tabs.map((tab) => tab.id),
    activeId,
    onChange: setActiveId,
    tabDomId: (id) => `${baseId}-tab-${id}`,
  });

  return (
    <section id="dashboard" aria-labelledby="showcase-title" className="scroll-mt-20 py-28 lg:py-36">
      <Container>
        <SectionTitle id="showcase-title" className="max-w-[20ch]">
          {SHOWCASE.title}
        </SectionTitle>
        <p className="mt-4 max-w-[52ch] text-lg text-l-ink-soft">{SHOWCASE.subtitle}</p>

        <div role="tablist" aria-label="Módulos del dashboard" onKeyDown={onTabKeyDown} className="mt-10 flex gap-1 overflow-x-auto pb-2 [scrollbar-width:none]">
          {SHOWCASE.tabs.map((tab) => {
            const Icon = TAB_ICONS[tab.id] ?? PieChart;
            const selected = tab.id === activeId;
            return (
              <button
                key={tab.id}
                id={`${baseId}-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                aria-controls={`${baseId}-panel`}
                onClick={() => setActiveId(tab.id)}
                className={cn(
                  "relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[15px] font-medium transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-l-brand-light/60",
                  selected ? "text-white" : "text-l-ink-soft hover:text-l-ink",
                )}
              >
                {selected && (
                  <motion.span
                    layoutId={`${baseId}-pill`}
                    className="absolute inset-0 rounded-full bg-l-brand"
                    transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon className="relative size-4" aria-hidden />
                <span className="relative">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 [perspective:1600px]">
          <motion.div
            ref={frameRef}
            style={reduceMotion ? undefined : { rotateX, scale, transformOrigin: "50% 0%" }}
            className="overflow-hidden rounded-[16px] bg-white shadow-l-lg"
          >
            <div className="flex items-center gap-2 border-b border-l-line px-4 py-3">
              <span className="size-2.5 rounded-full bg-l-line" aria-hidden />
              <span className="size-2.5 rounded-full bg-l-line" aria-hidden />
              <span className="size-2.5 rounded-full bg-l-line" aria-hidden />
              <span className="ml-3 truncate text-[13px] text-l-ink-soft">Campia · {active.label}</span>
              <span aria-hidden className="ml-auto hidden truncate text-[13px] text-l-ink-soft md:block">{active.caption}</span>
            </div>

            <div
              id={`${baseId}-panel`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-${active.id}`}
              className="relative aspect-[16/10] bg-l-surface"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0"
                >
                  <Image
                    src={`/landing/dashboard/${active.id}.webp`}
                    alt={`Pantalla ${active.label} de Campia: ${active.caption}`}
                    fill
                    sizes="(min-width: 1320px) 1240px, 100vw"
                    className="object-cover object-top"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
          <p aria-hidden className="mt-3 text-sm text-l-ink-soft md:hidden">{active.caption}</p>
        </div>
      </Container>
    </section>
  );
}
