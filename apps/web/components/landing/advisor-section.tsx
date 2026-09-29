import Image from "next/image";
import { Check } from "lucide-react";
import { ADVISOR } from "./content";
import { Container, SectionTitle } from "./primitives";

/** Modo asesor (Etapa 4): la Cartera real y la primera página de un informe en PDF. */
export function AdvisorSection() {
  return (
    <section id="asesores" aria-labelledby="asesores-title" className="scroll-mt-20 py-28 lg:py-36">
      <Container>
        <div className="grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="landing-reveal lg:col-span-4">
            <p className="text-sm font-semibold tracking-wide text-l-brand uppercase">{ADVISOR.eyebrow}</p>
            <SectionTitle id="asesores-title" className="mt-3 max-w-[16ch]">
              {ADVISOR.title}
            </SectionTitle>
            <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-l-ink-soft">{ADVISOR.body}</p>
            <ul className="mt-8 grid gap-3">
              {ADVISOR.points.map((point) => (
                <li key={point} className="flex gap-3 text-l-ink">
                  <Check className="mt-0.5 size-5 shrink-0 text-l-brand" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="landing-reveal relative lg:col-span-8 lg:pb-20">
            <div className="overflow-hidden rounded-[16px] bg-white shadow-l-lg">
              <div className="flex items-center gap-2 border-b border-l-line px-4 py-3" aria-hidden>
                <span className="size-2.5 rounded-full bg-l-line" />
                <span className="size-2.5 rounded-full bg-l-line" />
                <span className="size-2.5 rounded-full bg-l-line" />
                <span className="ml-3 truncate text-[13px] text-l-ink-soft">AgroData · Cartera</span>
              </div>
              <div className="relative aspect-[2000/1206]">
                <Image
                  src="/landing/dashboard/cartera-detalle.webp"
                  alt={ADVISOR.portfolioAlt}
                  fill
                  sizes="(min-width: 1024px) 820px, 100vw"
                  className="object-cover object-top"
                />
              </div>
            </div>

            {/* El informe como una hoja apoyada sobre la pantalla; se ve la parte de arriba. */}
            <div className="relative mx-auto -mt-10 w-[78%] max-w-[360px] rotate-[1.5deg] overflow-hidden rounded-[8px] bg-white shadow-l-lg ring-1 ring-l-line sm:w-[52%] lg:absolute lg:right-[-2%] lg:bottom-0 lg:mt-0 lg:w-[36%]">
              <div className="relative aspect-[1784/1500]">
                <Image
                  src="/landing/dashboard/informe.webp"
                  alt={ADVISOR.reportAlt}
                  fill
                  sizes="(min-width: 1024px) 320px, 60vw"
                  className="object-cover object-top"
                />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
