"use client";

import { BouncyAccordion, type BouncyAccordionItem } from "@/components/motion/bouncy-accordion";
import { EARLY_ACCESS, FAQ } from "./content";
import { Container, SectionTitle } from "./primitives";

/** Con el registro cerrado, la prueba se arranca pidiendo acceso. */
function columns(openSignup: boolean): BouncyAccordionItem[][] {
  const items: BouncyAccordionItem[] = FAQ.items.map((item) => ({
    id: item.id,
    // El título del accordion de beUI trunca en una línea; las preguntas largas tienen que poder cortar.
    title: <span className="block whitespace-normal">{item.q}</span>,
    description: item.id === "prueba" && !openSignup ? EARLY_ACCESS.faqTrial : item.a,
  }));
  const half = Math.ceil(items.length / 2);
  return [items.slice(0, half), items.slice(half)];
}

const CLASS_NAMES = {
  item: "rounded-[16px] bg-white shadow-l",
  trigger: "min-h-[68px] px-6 focus-visible:bg-l-surface",
  title: "text-base font-semibold text-l-ink",
  chevron: "text-l-ink-soft",
  description: "px-1 text-base leading-relaxed text-l-ink-soft",
};

export function Faq({ openSignup }: { openSignup: boolean }) {
  return (
    <section id="preguntas" aria-labelledby="preguntas-title" className="scroll-mt-20 py-28 lg:py-36">
      <Container>
        <SectionTitle id="preguntas-title">{FAQ.title}</SectionTitle>
        <div className="mt-12 grid gap-3 lg:grid-cols-2 lg:gap-4">
          {columns(openSignup).map((items, index) => (
            <BouncyAccordion key={index} items={items} collapsible classNames={CLASS_NAMES} />
          ))}
        </div>
      </Container>
    </section>
  );
}
