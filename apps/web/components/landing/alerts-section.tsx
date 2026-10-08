import Image from "next/image";
import { AlertTriangle, BellRing, Fuel, Info, ReceiptText, Syringe, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ALERTS } from "./content";
import { Container, SectionTitle } from "./primitives";

const KIND_ICONS = [Fuel, Syringe, TrendingDown, ReceiptText];

/** Avisos proactivos (Etapa 5): el panel real del Resumen y los tipos de aviso. */
export function AlertsSection() {
  return (
    <section id="avisos" aria-labelledby="avisos-title" className="scroll-mt-20 py-28 lg:py-36">
      <Container>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end lg:gap-16">
          <div className="landing-reveal lg:col-span-7">
            <p className="text-sm font-semibold tracking-wide text-l-brand uppercase">{ALERTS.eyebrow}</p>
            <SectionTitle id="avisos-title" className="mt-3 max-w-[18ch]">
              {ALERTS.title}
            </SectionTitle>
          </div>
          <p className="landing-reveal max-w-[48ch] text-lg leading-relaxed text-l-ink-soft lg:col-span-5">{ALERTS.body}</p>
        </div>

        {/* En celular la captura no se leía: se arma el mismo panel con texto real. Desde sm, la captura. */}
        <AlertsPanelPreview className="landing-reveal mt-12 sm:hidden" />
        <div className="landing-reveal mt-12 hidden overflow-hidden rounded-[20px] bg-white shadow-l-lg sm:block">
          <div className="relative aspect-[2584/770]">
            <Image
              src="/landing/dashboard/avisos.webp"
              alt={ALERTS.imageAlt}
              fill
              sizes="(min-width: 1320px) 1240px, 100vw"
              className="object-cover object-left-top"
            />
          </div>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
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

const SEVERITY = {
  warning: { label: "Atención", icon: AlertTriangle, chip: "bg-[#FDF4E3] text-[#8A5A12]", iconColor: "text-[#D97706]" },
  info: { label: "Para mirar", icon: Info, chip: "bg-l-surface text-l-ink-soft", iconColor: "text-l-ink-soft" },
} as const;

/** El panel de avisos del Resumen, con los mismos estilos que el dashboard (components/alerts-panel.tsx). */
function AlertsPanelPreview({ className }: { className?: string }) {
  return (
    <figure className={cn("rounded-[16px] bg-white p-5 shadow-l-lg", className)}>
      <figcaption className="flex items-center gap-1.5 font-heading text-sm font-bold text-l-ink">
        <BellRing className="size-4 text-l-brand" aria-hidden />
        Avisos
        <span className="rounded-full bg-l-brand-tint px-2 py-0.5 text-xs font-semibold text-l-brand">{ALERTS.sample.length}</span>
        <span className="ml-auto text-xs font-normal text-l-ink-soft">Datos de ejemplo</span>
      </figcaption>
      <ul className="mt-3 divide-y divide-l-line">
        {ALERTS.sample.map((alert) => {
          const severity = SEVERITY[alert.severity];
          const Icon = severity.icon;
          return (
            <li key={alert.title} className="flex gap-3 py-3 last:pb-0">
              <Icon className={cn("mt-0.5 size-[18px] shrink-0", severity.iconColor)} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-l-ink">
                  {alert.title}
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", severity.chip)}>{severity.label}</span>
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-l-ink-soft">{alert.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
