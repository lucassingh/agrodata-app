import type { ReactNode } from "react";

interface HeroBannerProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/** Puerto directo de frontend/src/components/shared/HeroBanner.tsx — banner de tope
 *  de página, sangra fuera del padding del content area (ver layout de (app)). */
export function HeroBanner({ title, subtitle, actions }: HeroBannerProps) {
  return (
    <div className="relative -mx-4 -mt-4 overflow-hidden rounded-b-2xl bg-gradient-to-br from-primary to-primary-dark px-6 py-7 text-white sm:px-8 sm:py-8 md:-mx-6 md:-mt-6">
      <div className="pointer-events-none absolute -top-12 -right-12 size-56 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute right-24 -bottom-16 size-36 rounded-full bg-white/[0.03]" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">{title}</h1>
          {subtitle ? (
            <p className="mt-1 max-w-xl text-sm text-white/80">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
