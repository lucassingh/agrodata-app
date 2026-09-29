"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import type { StoreApi, UseBoundStore } from "zustand";
import { Button } from "@/components/ui/button";
import { TOUR_OVERLAY_Z_INDEX } from "../config";
import type { TourTargetRect } from "../hooks/use-tour-target";
import { placePopover, VIEWPORT_PADDING } from "../popover-position";
import type { ProductTourState, TourStep } from "../types";

const WIDTH = 320;

/**
 * El cartel del paso: progreso dentro de la sección, título, texto y las cuatro
 * acciones (atrás, saltar sección, siguiente o terminar, salir). Se ubica con
 * `placePopover` al lado del elemento y sigue su posición.
 */
export function createTourPopover<TCtx>(useTourStore: UseBoundStore<StoreApi<ProductTourState<TCtx>>>) {
  return function TourPopover({ step, rect }: { step: TourStep; rect: TourTargetRect }) {
    const steps = useTourStore((s) => s.steps);
    const stepIndex = useTourStore((s) => s.stepIndex);
    const goNext = useTourStore((s) => s.goNext);
    const goBack = useTourStore((s) => s.goBack);
    const skipGroup = useTourStore((s) => s.skipGroup);
    const exitTour = useTourStore((s) => s.exitTour);
    const reduceMotion = useReducedMotion();

    const groupSteps = useMemo(() => steps.filter((s) => s.groupId === step.groupId), [steps, step.groupId]);
    const indexInGroup = Math.max(groupSteps.findIndex((s) => s.id === step.id), 0);
    const isFirstOverall = stepIndex === 0;
    const isLastOverall = stepIndex === steps.length - 1;
    const hasNextGroup = useMemo(
      () => steps.some((s, idx) => idx > stepIndex && s.groupId !== step.groupId),
      [steps, stepIndex, step.groupId],
    );

    // El tamaño real del cartel (cambia con el texto) para ubicarlo sin taparse.
    const ref = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | null>(null);
    useLayoutEffect(() => {
      const el = ref.current;
      if (!el) return;
      const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const width = Math.min(WIDTH, viewport.width - VIEWPORT_PADDING * 2);
    const position = placePopover(rect, { width, height: height ?? 200 }, step.placement ?? "bottom-start", viewport);
    const titleId = `tour-step-title-${step.id}`;

    return (
      <div
        ref={ref}
        role="dialog"
        aria-modal="false"
        aria-labelledby={step.title ? titleId : undefined}
        aria-describedby={`tour-step-body-${step.id}`}
        className="fixed"
        style={{
          zIndex: TOUR_OVERLAY_Z_INDEX + 2,
          width,
          top: position.top,
          left: position.left,
          // Hasta medirlo no se muestra: evita un cuadro en el lugar equivocado.
          visibility: height === null ? "hidden" : "visible",
        }}
      >
        <motion.div
          key={step.id}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={reduceMotion ? { duration: 0.12 } : { type: "spring", stiffness: 420, damping: 32, mass: 0.7 }}
          className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-[0_16px_40px_rgba(27,67,50,0.18)]"
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <p className="text-[11px] font-bold tracking-wide text-primary uppercase" aria-live="polite">
              Paso {indexInGroup + 1} de {groupSteps.length}
            </p>
            <button
              type="button"
              onClick={exitTour}
              className="-mt-0.5 rounded text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Salir de la guía
            </button>
          </div>

          {step.title ? (
            <h2 id={titleId} className="mb-1 font-heading text-base leading-snug font-bold text-foreground">
              {step.title}
            </h2>
          ) : null}
          <p id={`tour-step-body-${step.id}`} className="text-sm leading-relaxed text-muted-foreground">
            {step.body}
          </p>

          <div className="mt-4 flex items-center justify-between gap-2">
            <div>
              {!isFirstOverall ? (
                <Button variant="outline" size="icon-sm" onClick={goBack} aria-label="Paso anterior">
                  <ChevronLeft size={16} />
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {hasNextGroup ? (
                <Button variant="ghost" size="sm" onClick={skipGroup} className="text-muted-foreground">
                  Saltar esta sección
                </Button>
              ) : null}
              {/* autoFocus: con teclado, Enter avanza y Escape sale. */}
              <Button size="sm" onClick={goNext} autoFocus>
                {isLastOverall ? "Terminar" : "Siguiente"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };
}
