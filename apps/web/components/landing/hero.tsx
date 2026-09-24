import { ArrowDown } from "lucide-react";
import BlurText from "@/components/react-bits/BlurText";
import { CtaLink } from "./cta-link";
import { DEMO_CTA_LABEL, HERO } from "./content";
import { HeroScene } from "./hero-scene";
import { Container } from "./primitives";

export function Hero() {
  return (
    <section aria-label="Presentación" className="pt-24 pb-24 lg:pt-32 lg:pb-28">
      <Container>
        <div className="max-w-[1200px]">
          <BlurText
            as="h1"
            text={HERO.title}
            delay={70}
            animateBy="words"
            direction="bottom"
            stepDuration={0.3}
            className="font-heading text-[clamp(2.4rem,5vw,4.5rem)] leading-[1.04] font-bold tracking-[-0.035em] text-l-ink"
          />
          <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-l-ink-soft lg:text-xl">{HERO.subtitle}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <CtaLink href="#demo" size="lg">
              {DEMO_CTA_LABEL}
            </CtaLink>
            <CtaLink href="#como-funciona" variant="secondary" size="lg">
              {HERO.secondaryCta}
              <ArrowDown className="size-4" aria-hidden />
            </CtaLink>
          </div>
        </div>
      </Container>

      {/* La foto es más ancha que la columna del título: sale del container. */}
      <div className="mx-auto mt-12 w-full max-w-[1600px] px-4 sm:px-6 lg:mt-16 lg:px-8">
        <HeroScene />
      </div>
    </section>
  );
}
