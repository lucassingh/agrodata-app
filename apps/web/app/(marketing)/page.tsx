import type { Metadata } from "next";
import { ActivitiesMarquee } from "@/components/landing/activities-marquee";
import { DemoCta } from "@/components/landing/demo-cta";
import { Faq } from "@/components/landing/faq";
import { FeaturesBento } from "@/components/landing/features-bento";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingMotion } from "@/components/landing/landing-motion";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { MultiField } from "@/components/landing/multi-field";
import { Pricing } from "@/components/landing/pricing";
import { Problem } from "@/components/landing/problem";
import { ProductShowcase } from "@/components/landing/product-showcase";
import { Profiles } from "@/components/landing/profiles";

export const metadata: Metadata = {
  title: "AgroData | Todo tu campo, ordenado desde WhatsApp",
  description:
    "Un mensaje, un audio o la foto de una factura. AgroData lo convierte en datos listos para consultar y exportar. Para agrónomos, veterinarios y productores.",
  openGraph: {
    title: "AgroData | Todo tu campo, ordenado desde WhatsApp",
    description:
      "Cargá siembra, animales, gastos y facturas desde WhatsApp. Consultá y exportá cuando lo necesites.",
    images: [{ url: "/landing/hero-potreros.jpg", width: 2400, height: 1816 }],
    locale: "es_AR",
    type: "website",
  },
};

export default function MarketingHomePage() {
  return (
    <LandingMotion>
      <div className="landing min-h-dvh font-sans">
        <a
          href="#contenido"
          className="sr-only z-50 rounded-full bg-l-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Saltar al contenido
        </a>
        <LandingNav />
        <main id="contenido">
          <Hero />
          <ActivitiesMarquee />
          <Problem />
          <HowItWorks />
          <FeaturesBento />
          <MultiField />
          <ProductShowcase />
          <Profiles />
          <Pricing />
          <Faq />
          <DemoCta />
        </main>
        <LandingFooter />
      </div>
    </LandingMotion>
  );
}
