"use client";

import Image from "next/image";
import Link from "next/link";
import CardNav, { type CardNavItem } from "@/components/react-bits/CardNav";
import { CtaLink } from "./cta-link";
import { DEMO_CTA_LABEL, SIGN_IN_LABEL } from "./content";

const NAV_ITEMS: CardNavItem[] = [
  {
    label: "Producto",
    bgColor: "var(--l-brand-dark)",
    textColor: "#ffffff",
    links: [
      { label: "Cómo funciona", href: "#como-funciona" },
      { label: "Funciones", href: "#producto" },
      { label: "Dashboard", href: "#dashboard" },
    ],
  },
  {
    label: "Para quién",
    bgColor: "var(--l-brand)",
    textColor: "#ffffff",
    links: [
      { label: "Ingenieros agrónomos", href: "#para-quien" },
      { label: "Veterinarios", href: "#para-quien" },
      { label: "Productores", href: "#para-quien" },
    ],
  },
  {
    label: "Empezá",
    bgColor: "var(--l-accent-tint)",
    textColor: "var(--l-ink)",
    links: [
      { label: DEMO_CTA_LABEL, href: "#demo" },
      { label: "Precios", href: "#precios" },
      { label: "Preguntas frecuentes", href: "#preguntas" },
      { label: SIGN_IN_LABEL, href: "/dashboard/sign-in" },
    ],
  },
];

export function LandingNav() {
  return (
    <CardNav
      items={NAV_ITEMS}
      logo={
        <Link href="/" aria-label="AgroData, inicio" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-l-brand-light/60">
          <Image src="/brand/logo.png" alt="AgroData" width={635} height={121} priority className="h-auto w-[120px]" />
        </Link>
      }
      cta={
        <div className="flex items-center gap-2">
          <CtaLink href="/dashboard/sign-in" variant="secondary">
            {SIGN_IN_LABEL}
          </CtaLink>
          <CtaLink href="#demo">{DEMO_CTA_LABEL}</CtaLink>
        </div>
      }
    />
  );
}
