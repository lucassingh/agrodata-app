import Link from "next/link";
import { ACCESS_CTA_LABEL, FOOTER, SUPPORT_EMAIL } from "./content";
import { CampiaLogo } from "@/components/brand/campia-logo";
import { Container } from "./primitives";

export function LandingFooter({ openSignup }: { openSignup: boolean }) {
  const columns = openSignup
    ? FOOTER.columns
    : FOOTER.columns.map((column) => ({
        ...column,
        links: column.links.map((link) =>
          link.href === "/dashboard/register" ? { href: "/#demo", label: ACCESS_CTA_LABEL } : link,
        ),
      }));

  return (
    <footer className="relative overflow-hidden pt-24 pb-10">
      <Container>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <CampiaLogo className="text-l-brand text-[26px]" />
            <p className="mt-5 max-w-[30ch] text-lg leading-relaxed text-l-ink-soft">{FOOTER.tagline}</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-4 inline-block rounded-sm text-l-ink-soft underline-offset-4 transition-colors duration-200 outline-none hover:text-l-ink hover:underline focus-visible:ring-3 focus-visible:ring-l-brand-light/60"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
          <nav aria-label="Pie de página" className="grid grid-cols-2 gap-8 md:col-span-7 md:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="font-heading text-sm font-semibold text-l-ink">{column.title}</p>
                <ul className="mt-4 grid gap-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="rounded-sm text-l-ink-soft transition-colors duration-200 outline-none hover:text-l-ink focus-visible:ring-3 focus-visible:ring-l-brand-light/60"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <p
          aria-hidden
          className="mt-20 font-heading text-[clamp(4.5rem,19vw,17rem)] leading-[0.8] font-bold tracking-[-0.04em] text-l-brand-tint select-none"
        >
          campIA
        </p>

        <div className="mt-8 flex flex-col gap-2 border-t border-l-line pt-6 text-sm text-l-ink-soft sm:flex-row sm:justify-between">
          <p>© 2026 Campia</p>
          <p>Hecho en Argentina</p>
        </div>
      </Container>
    </footer>
  );
}
