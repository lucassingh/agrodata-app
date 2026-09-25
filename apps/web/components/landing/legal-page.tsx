import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LEGAL } from "./content";
import { Container } from "./primitives";
import { LandingFooter } from "./landing-footer";

interface LegalPageProps {
  title: string;
  intro: string;
  children: ReactNode;
}

/** Marco de las páginas legales (Términos, Privacidad): mismo look que la
 *  landing, con una columna de lectura angosta. */
export function LegalPage({ title, intro, children }: LegalPageProps) {
  return (
    <div className="landing min-h-dvh font-sans">
      <header className="border-b border-l-line">
        <Container className="flex h-16 items-center justify-between">
          <Link
            href="/"
            aria-label="AgroData, inicio"
            className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-l-brand-light/60"
          >
            <Image src="/brand/logo.png" alt="AgroData" width={635} height={121} priority className="h-auto w-[120px]" />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-sm text-sm text-l-ink-soft transition-colors outline-none hover:text-l-ink focus-visible:ring-3 focus-visible:ring-l-brand-light/60"
          >
            <ArrowLeft size={16} aria-hidden />
            Volver al inicio
          </Link>
        </Container>
      </header>

      <main id="contenido">
        <Container>
          <article className="mx-auto max-w-[68ch] py-16 sm:py-24">
            <p className="text-sm text-l-ink-soft">Última actualización: {LEGAL.updatedAt}</p>
            <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight text-l-ink sm:text-5xl">{title}</h1>
            <p className="mt-6 text-lg leading-relaxed text-l-ink-soft">{intro}</p>
            <div className="mt-12">{children}</div>
          </article>
        </Container>
      </main>

      <LandingFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-heading text-xl font-semibold text-l-ink">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-l-ink-soft [&_a]:text-l-brand [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-l-ink [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}
