import type { Metadata } from "next";
import { ActivitiesMarquee } from "@/components/landing/activities-marquee";
import { AdvisorSection } from "@/components/landing/advisor-section";
import { AlertsSection } from "@/components/landing/alerts-section";
import { Comparison } from "@/components/landing/comparison";
import { DemoCta } from "@/components/landing/demo-cta";
import { Faq } from "@/components/landing/faq";
import { FeaturesBento } from "@/components/landing/features-bento";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingMotion } from "@/components/landing/landing-motion";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { LotMargin } from "@/components/landing/lot-margin";
import { LivestockDairy } from "@/components/landing/livestock-dairy";
import { MultiField } from "@/components/landing/multi-field";
import { Pricing } from "@/components/landing/pricing";
import { Problem } from "@/components/landing/problem";
import { ProductShowcase } from "@/components/landing/product-showcase";
import { Profiles } from "@/components/landing/profiles";
import { signupMode } from "@/lib/signup-mode";

/** La imagen para compartir lleva el mismo llamado que la landing: «Probalo gratis»
 *  con el registro abierto, «Pedí acceso» con el registro por invitación. */
const SHARE_IMAGE = signupMode() === "open" ? "/landing/og-image.jpg" : "/landing/og-image-acceso.jpg";

export const metadata: Metadata = {
  title: "campIA | Todo tu campo, ordenado desde WhatsApp",
  description:
    "Un mensaje, un audio o la foto de una factura. campIA lo convierte en datos listos para consultar y exportar. Para agrónomos, veterinarios y productores.",
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    siteName: "campIA",
    title: "campIA | Todo tu campo, ordenado desde WhatsApp",
    description:
      "Cargá siembra, animales, gastos y facturas desde WhatsApp. Consultá y exportá cuando lo necesites.",
    images: [{ url: SHARE_IMAGE, width: 1200, height: 630, alt: "campIA: todo lo que pasa en tu campo, ordenado desde WhatsApp" }],
    locale: "es_AR",
    type: "website",
  },
  twitter: { card: "summary_large_image", images: [SHARE_IMAGE] },
};

export default function MarketingHomePage() {
  const openSignup = signupMode() === "open";
  return (
    <LandingMotion>
      <div className="landing min-h-dvh font-sans">
        <a
          href="#contenido"
          className="sr-only z-50 rounded-full bg-l-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Saltar al contenido
        </a>
        <LandingNav openSignup={openSignup} />
        <main id="contenido">
          <Hero openSignup={openSignup} />
          <ActivitiesMarquee />
          <Problem />
          <HowItWorks />
          <FeaturesBento />
          <LotMargin />
          <LivestockDairy />
          <AlertsSection />
          <MultiField />
          <AdvisorSection />
          <ProductShowcase />
          <Comparison />
          <Profiles />
          <Pricing openSignup={openSignup} />
          <Faq openSignup={openSignup} />
          <DemoCta openSignup={openSignup} />
        </main>
        <LandingFooter openSignup={openSignup} />
      </div>
    </LandingMotion>
  );
}
