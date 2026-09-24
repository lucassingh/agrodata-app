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
