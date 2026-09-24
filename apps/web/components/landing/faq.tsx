"use client";

import { BouncyAccordion, type BouncyAccordionItem } from "@/components/motion/bouncy-accordion";
import { FAQ } from "./content";
import { Container, SectionTitle } from "./primitives";

const ITEMS: BouncyAccordionItem[] = FAQ.items.map((item) => ({
  id: item.id,
  // El título del accordion de beUI trunca en una línea; las preguntas largas tienen que poder cortar.
  title: <span className="block whitespace-normal">{item.q}</span>,
  description: item.a,
}));

const HALF = Math.ceil(ITEMS.length / 2);
const COLUMNS = [ITEMS.slice(0, HALF), ITEMS.slice(HALF)];

const CLASS_NAMES = {
  item: "rounded-[16px] bg-white shadow-l",
  trigger: "min-h-[68px] px-6 focus-visible:bg-l-surface",
  title: "text-base font-semibold text-l-ink",
  chevron: "text-l-ink-soft",
  description: "px-1 text-base leading-relaxed text-l-ink-soft",
};

export function Faq() {
  return (
    <section id="preguntas" aria-labelledby="preguntas-title" className="scroll-mt-20 py-28 lg:py-36">
      <Container>
        <SectionTitle id="preguntas-title">{FAQ.title}</SectionTitle>
        <div className="mt-12 grid gap-3 lg:grid-cols-2 lg:gap-4">
          {COLUMNS.map((items, index) => (
            <BouncyAccordion key={index} items={items} collapsible classNames={CLASS_NAMES} />
          ))}
        </div>
      </Container>
    </section>
  );
}
