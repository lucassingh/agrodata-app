import { CtaLink } from "./cta-link";
import { DEMO_CTA_LABEL, EARLY_ACCESS, HERO, primaryCta } from "./content";
import { HeroScene } from "./hero-scene";
import { HeroTitle } from "./hero-title";
import { Container } from "./primitives";

export function Hero({ openSignup }: { openSignup: boolean }) {
  const primary = primaryCta(openSignup);
  return (
    <section aria-label="Presentación" className="pt-24 pb-24 lg:pt-32 lg:pb-28">
      <Container>
        <div className="max-w-[1200px]">
          <HeroTitle text={HERO.title} />
          <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-l-ink-soft lg:text-xl">{HERO.subtitle}</p>
          {/* En celular los dos botones van a todo el ancho, uno abajo del otro. */}
          <div className="mt-8 grid grid-cols-1 gap-3 min-[420px]:flex min-[420px]:flex-wrap min-[420px]:items-center">
            <CtaLink href={primary.href} size="lg">
              {primary.label}
            </CtaLink>
            {/* Con el registro cerrado, «Pedir demo» llevaría al mismo formulario. */}
            <CtaLink href={openSignup ? "#demo" : "#como-funciona"} variant="secondary" size="lg">
              {openSignup ? DEMO_CTA_LABEL : "Ver cómo funciona"}
            </CtaLink>
          </div>
          <p className="mt-3 text-sm text-l-ink-soft">{openSignup ? HERO.trialNote : EARLY_ACCESS.heroNote}</p>
        </div>
      </Container>

      {/* La foto es más ancha que la columna del título: sale del container. */}
      <div className="mx-auto mt-12 w-full max-w-[1600px] px-4 sm:px-6 lg:mt-16 lg:px-8">
        <HeroScene />
      </div>
    </section>
  );
}
