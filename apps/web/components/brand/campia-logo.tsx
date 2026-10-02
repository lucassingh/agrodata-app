import { cn } from "@/lib/utils";

/**
 * Logo de marca Campia (campIA). Monocromo: usa `currentColor`, así que el color
 * lo define la clase de texto del contexto (ej. `text-primary`, `text-white`,
 * `text-l-brand`). El tamaño se controla con el font-size (ej. `text-[22px]`).
 *
 * - `variant="full"` → isotipo + wordmark campIA (lockup horizontal).
 * - `variant="mark"` → solo el isotipo.
 *
 * El isotipo es el campo en lotes con el nodo de IA calado (ver branding/01-logo).
 */
type CampiaLogoProps = {
  variant?: "full" | "mark";
  className?: string;
  title?: string;
};

function CampiaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M8.5 9.5 L20.5 8.5 L19.5 40 L8.5 40 Z" />
      <path d="M23 8.5 L40 9.8 L40 22.8 L22.6 23.6 Z" />
      <path
        d="M23 25.8 L40 25 L39.4 40 L22 40 Z M34.2 33 a3.2 3.2 0 1 0 -6.4 0 a3.2 3.2 0 1 0 6.4 0 Z"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function CampiaLogo({ variant = "full", className, title = "Campia" }: CampiaLogoProps) {
  if (variant === "mark") {
    return (
      <span role="img" aria-label={title} className={cn("inline-flex", className)}>
        <CampiaMark className="h-[1em] w-auto" />
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={title}
      className={cn("inline-flex items-center gap-[0.26em] leading-none", className)}
    >
      <CampiaMark className="h-[1.08em] w-auto shrink-0" />
      <span className="font-heading text-[1em] font-extrabold tracking-[-0.03em]">campIA</span>
    </span>
  );
}
