import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Contenedor horizontal de la landing: mismo ancho máximo y gutters en todas las secciones. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-10", className)}>{children}</div>;
}

export function SectionTitle({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <h2
      id={id}
      className={cn(
        "font-heading text-[clamp(2rem,3.4vw,3.25rem)] leading-[1.06] font-bold tracking-[-0.03em] text-l-ink",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/** Marca una función prometida que todavía no está disponible. Se saca cuando existe. */
export function SoonBadge({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        onDark ? "bg-white/15 text-white" : "bg-l-accent-tint text-l-ink",
        className,
      )}
    >
      Próximamente
    </span>
  );
}

/** Una función de un plan: texto, o texto marcado como próximamente. */
export type PlanFeature = string | { label: string; soon: boolean };

export function featureLabel(feature: PlanFeature): string {
  return typeof feature === "string" ? feature : feature.label;
}
