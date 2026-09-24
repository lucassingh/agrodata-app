"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { BookOpen, FileSpreadsheet, ImageIcon, Mic } from "lucide-react";
import { useRef } from "react";
import ScrollReveal from "@/components/react-bits/ScrollReveal";
import { PROBLEM } from "./content";
import { Container } from "./primitives";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

const SCRAP_ICONS = [BookOpen, ImageIcon, Mic, FileSpreadsheet];

/** Posición "desordenada" inicial de cada papel suelto: [x %, y px, rotación °]. */
const SCATTER: [number, number, number][] = [
  [-18, 70, -9],
  [14, -46, 7],
  [-10, -28, -5],
  [20, 58, 11],
];

export function Problem() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "center center"] });

  return (
    <section ref={sectionRef} aria-labelledby="problema-title" className="py-28 lg:py-40">
      <Container>
        <h2 id="problema-title" className="sr-only">
          El problema
        </h2>
        <ScrollReveal
          as="p"
          baseOpacity={0.12}
          baseRotation={2}
          blurStrength={5}
          className="max-w-[22ch] font-heading text-[clamp(2rem,4.4vw,4rem)] leading-[1.1] font-semibold tracking-[-0.03em] text-l-ink sm:max-w-[26ch]"
        >
          {PROBLEM.statement}
        </ScrollReveal>

        <ul className="mt-20 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-28 lg:grid-cols-4">
          {PROBLEM.scraps.map((scrap, index) => (
            <Scrap
              key={scrap.label}
              index={index}
              label={scrap.label}
              detail={scrap.detail}
              progress={scrollYProgress}
              still={Boolean(reduceMotion)}
            />
          ))}
        </ul>

        <p className="landing-reveal mt-20 font-heading text-[clamp(1.6rem,2.6vw,2.4rem)] leading-tight font-bold tracking-[-0.02em] text-l-brand lg:mt-24">
          {PROBLEM.promise}
        </p>
      </Container>
    </section>
  );
}

function Scrap({
  index,
  label,
  detail,
  progress,
  still,
}: {
  index: number;
  label: string;
  detail: string;
  progress: MotionValue<number>;
  still: boolean;
}) {
  const [x, y, rotate] = SCATTER[index] ?? [0, 0, 0];
  const Icon = SCRAP_ICONS[index] ?? BookOpen;
  const translateX = useTransform(progress, [0, 1], [`${x}%`, "0%"]);
  const translateY = useTransform(progress, [0, 1], [y, 0]);
  const rotation = useTransform(progress, [0, 1], [rotate, 0]);

  return (
    <motion.li
      style={still ? undefined : { x: translateX, y: translateY, rotate: rotation }}
      className="flex items-start gap-3 rounded-[16px] bg-white p-5 shadow-l"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-l-surface text-l-ink-soft">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-l-ink">{label}</span>
        <span className="mt-0.5 block truncate text-[13px] text-l-ink-soft">{detail}</span>
      </span>
    </motion.li>
  );
}
