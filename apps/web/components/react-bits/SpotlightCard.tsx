"use client";

// Adaptado de React Bits (reactbits.dev/components/spotlight-card).
// Cambios: la posición del cursor se escribe como variables CSS en el elemento
// (sin useState, que re-renderizaba en cada movimiento del mouse) y el estilo
// base es neutro para que lo defina quien lo usa.

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
}

export default function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(255, 255, 255, 0.25)",
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  };

  return (
    <div ref={ref} onPointerMove={handlePointerMove} className={cn("group/spot relative overflow-hidden", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover/spot:opacity-100 motion-reduce:hidden"
        style={{
          background: `radial-gradient(420px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${spotlightColor}, transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
}
