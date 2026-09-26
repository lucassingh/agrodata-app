import { HeartPulse, Milk, Scale } from "lucide-react";
import { LIVESTOCK_DAIRY } from "./content";
import { Container, SectionTitle } from "./primitives";

const ICONS = { ganaderia: Scale, reproduccion: HeartPulse, tambo: Milk } as const;

/** Ganadería productiva y tambo: el segundo diferencial, para veterinarios y tamberos. */
export function LivestockDairy() {
  return (
    <section id="ganaderia" aria-labelledby="ganaderia-title" className="scroll-mt-20 bg-l-surface py-28 lg:py-36">
      <Container>
        <div className="landing-reveal max-w-[62ch]">
          <p className="text-sm font-semibold tracking-wide text-l-brand uppercase">{LIVESTOCK_DAIRY.eyebrow}</p>
          <SectionTitle id="ganaderia-title" className="mt-3 max-w-[22ch]">
            {LIVESTOCK_DAIRY.title}
          </SectionTitle>
          <p className="mt-6 text-lg leading-relaxed text-l-ink-soft">{LIVESTOCK_DAIRY.body}</p>
        </div>

        <ul className="mt-14 grid gap-4 md:grid-cols-3">
          {LIVESTOCK_DAIRY.cards.map((card) => {
            const Icon = ICONS[card.id as keyof typeof ICONS];
            return (
              <li key={card.id} className="landing-reveal flex flex-col rounded-[20px] bg-white p-6 sm:p-7">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-l-brand-tint text-l-brand">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="font-heading text-xl font-semibold text-l-ink">{card.title}</h3>
                </div>
                <p className="mt-6 font-heading text-[clamp(1.75rem,2.6vw,2.5rem)] leading-none font-bold tracking-[-0.02em] text-l-brand">
                  {card.stat}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-l-ink-soft">{card.statLabel}</p>
                <ul className="mt-6 grid gap-2 border-t border-l-line pt-5">
                  {card.points.map((point) => (
                    <li key={point} className="flex gap-2 text-l-ink-soft">
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-l-brand" />
                      {point}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-right text-xs text-l-ink-soft">{LIVESTOCK_DAIRY.note}</p>
      </Container>
    </section>
  );
}
