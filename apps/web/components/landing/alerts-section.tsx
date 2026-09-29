import Image from "next/image";
import { Fuel, ReceiptText, Syringe, TrendingDown } from "lucide-react";
import { ALERTS } from "./content";
import { Container, SectionTitle } from "./primitives";

const KIND_ICONS = [Fuel, Syringe, TrendingDown, ReceiptText];

/** Avisos proactivos (Etapa 5): el panel real del Resumen y los tipos de aviso. */
export function AlertsSection() {
  return (
    <section id="avisos" aria-labelledby="avisos-title" className="scroll-mt-20 py-28 lg:py-36">
      <Container>
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-16">
          <div className="landing-reveal lg:col-span-7">
            <p className="text-sm font-semibold tracking-wide text-l-brand uppercase">{ALERTS.eyebrow}</p>
            <SectionTitle id="avisos-title" className="mt-3 max-w-[18ch]">
              {ALERTS.title}
            </SectionTitle>
          </div>
          <p className="landing-reveal max-w-[48ch] text-lg leading-relaxed text-l-ink-soft lg:col-span-5">{ALERTS.body}</p>
        </div>

        {/* En celular se ve la columna de títulos, ampliada; desde sm, el panel entero. */}
        <div className="landing-reveal mt-12 overflow-hidden rounded-[20px] bg-white shadow-l-lg">
          <div className="relative aspect-square sm:aspect-[2584/770]">
            <Image
              src="/landing/dashboard/avisos.webp"
              alt={ALERTS.imageAlt}
              fill
              sizes="(min-width: 1320px) 1240px, 100vw"
              className="object-cover object-left-top"
            />
          </div>
        </div>

        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {ALERTS.kinds.map((kind, index) => {
            const Icon = KIND_ICONS[index] ?? Fuel;
            return (
              <li key={kind.title} className="landing-reveal flex gap-4 lg:flex-col lg:gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-l-accent-tint text-l-accent-strong">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-heading font-semibold text-l-ink">{kind.title}</h3>
                  <p className="mt-1 leading-relaxed text-l-ink-soft">{kind.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
