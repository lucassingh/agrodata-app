"use client";

import { useEffect, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import type { StoreApi, UseBoundStore } from "zustand";
import { useSmoothedRect } from "./hooks/use-smoothed-rect";
import { useTourTarget, type TourTargetRect } from "./hooks/use-tour-target";
import type { ProductTourState, TourStep } from "./types";

interface DisplayedStep {
  step: TourStep;
  rect: TourTargetRect;
  clearRect: TourTargetRect;
}

type SpotlightComponent = ComponentType<{ holeRect: TourTargetRect | null; ringRect: TourTargetRect | null }>;
type PopoverComponent = ComponentType<{ step: TourStep; rect: TourTargetRect }>;

/**
 * El único punto de montaje del tour: se porta a `document.body` para quedar por
 * encima de menús y cajones. Lee el paso activo y le pide a `useTourTarget` que
 * lo encuentre; si no aparece a tiempo, `goNext()` lo saltea. El cartel no cambia
 * de texto hasta que el elemento del paso NUEVO está resuelto: nunca se ve el
 * texto de un paso apuntando al anterior.
 */
export function createProductTourOverlay<TCtx>(
  useTourStore: UseBoundStore<StoreApi<ProductTourState<TCtx>>>,
  TourSpotlightMask: SpotlightComponent,
  TourPopover: PopoverComponent,
) {
  return function ProductTourOverlay() {
    const activeTourId = useTourStore((s) => s.activeTourId);
    const steps = useTourStore((s) => s.steps);
    const stepIndex = useTourStore((s) => s.stepIndex);
    const goNext = useTourStore((s) => s.goNext);
    const exitTour = useTourStore((s) => s.exitTour);

    const currentStep = activeTourId ? (steps[stepIndex] ?? null) : null;
    const { rect: liveRect, clearRect: liveClearRect, resolvedFor } = useTourTarget(
      currentStep?.target ?? null,
      currentStep?.unionWith,
      currentStep?.clearWith,
      goNext,
    );

    const [displayed, setDisplayed] = useState<DisplayedStep | null>(null);
    useEffect(() => {
      if (!currentStep) {
        setDisplayed(null);
      } else if (liveRect && liveClearRect && resolvedFor === currentStep.target) {
        setDisplayed({ step: currentStep, rect: liveRect, clearRect: liveClearRect });
      }
    }, [currentStep, liveRect, liveClearRect, resolvedFor]);

    const smoothedRect = useSmoothedRect(displayed?.rect ?? null);
    const smoothedClearRect = useSmoothedRect(displayed?.clearRect ?? null);

    useEffect(() => {
      if (!activeTourId) return;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") exitTour();
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, [activeTourId, exitTour]);

    if (!activeTourId || !displayed) return null;

    return createPortal(
      <>
        <TourSpotlightMask ringRect={smoothedRect} holeRect={smoothedClearRect ?? smoothedRect} />
        {smoothedRect ? <TourPopover step={displayed.step} rect={smoothedRect} /> : null}
      </>,
      document.body,
    );
  };
}
