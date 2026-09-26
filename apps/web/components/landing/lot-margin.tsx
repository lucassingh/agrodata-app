import { Coins, Sprout, Target } from "lucide-react";
import { LOT_MARGIN } from "./content";
import { Container, SectionTitle } from "./primitives";

const POINT_ICONS = [Sprout, Coins, Target];

/** Economía por lote: el diferencial frente a otras apps de registro. */
export function LotMargin() {
  const { example } = LOT_MARGIN;
  const max = Math.max(...example.lots.map((lot) => Math.abs(lot.margin)));

  return (
    <section id="economia" aria-labelledby="economia-title" className="scroll-mt-20 py-28 lg:py-36">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="landing-reveal lg:col-span-5">
            <p className="text-sm font-semibold tracking-wide text-l-brand uppercase">{LOT_MARGIN.eyebrow}</p>
            <SectionTitle id="economia-title" className="mt-3 max-w-[18ch]">
              {LOT_MARGIN.title}
            </SectionTitle>
            <p className="mt-6 max-w-[48ch] text-lg leading-relaxed text-l-ink-soft">{LOT_MARGIN.body}</p>
            <ul className="mt-10 grid gap-6">
              {LOT_MARGIN.points.map((point, index) => {
                const Icon = POINT_ICONS[index] ?? Sprout;
                return (
                  <li key={point.title} className="flex gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-l-brand-tint text-l-brand">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <p className="font-heading font-semibold text-l-ink">{point.title}</p>
                      <p className="mt-1 leading-relaxed text-l-ink-soft">{point.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <figure className="landing-reveal rounded-[20px] bg-l-surface p-5 sm:p-8 lg:col-span-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <figcaption className="font-heading text-lg font-semibold text-l-ink">{example.title}</figcaption>
              <span className="rounded-full bg-white px-3 py-1 text-xs text-l-ink-soft">{example.note}</span>
            </div>

            <ul className="mt-6 grid gap-4 rounded-[16px] bg-white p-5 sm:p-6">
              {example.lots.map((lot) => {
                const positive = lot.margin >= 0;
                return (
                  <li key={lot.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[10rem_minmax(0,1fr)_6rem]">
                    <div>
                      <p className="font-medium text-l-ink">{lot.name}</p>
                      <p className="text-xs text-l-ink-soft">{lot.ha} ha</p>
                    </div>
                    <p className={`text-right font-heading font-semibold sm:order-last ${positive ? "text-l-brand" : "text-[#C4453A]"}`}>
                      {positive ? "" : "−"}US$ {Math.abs(lot.margin)}
                    </p>
                    <div className="col-span-2 h-3 overflow-hidden rounded-full bg-l-surface sm:col-span-1" aria-hidden>
                      <div
                        className={`h-full rounded-full ${positive ? "bg-l-brand" : "bg-[#C4453A]"}`}
                        style={{ width: `${Math.max(4, (Math.abs(lot.margin) / max) * 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            <p className="mt-6 text-sm font-medium text-l-ink-soft">{example.statsTitle}</p>
            <dl className="mt-2 grid grid-cols-3 gap-3">
              {example.stats.map((stat) => (
                <div key={stat.label} className="rounded-[14px] bg-white px-4 py-3">
                  <dt className="text-xs text-l-ink-soft">{stat.label}</dt>
                  <dd className="mt-1 font-heading text-sm font-semibold text-l-ink sm:text-base">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </figure>
        </div>
      </Container>
    </section>
  );
}
