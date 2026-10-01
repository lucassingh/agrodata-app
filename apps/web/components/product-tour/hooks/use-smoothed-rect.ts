"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../reduced-motion";
import type { TourTargetRect } from "./use-tour-target";

/** Qué parte del camino recorre cada cuadro: más alto, más rápido. */
const SMOOTHING = 0.22;
/** Debajo de esto (px) se considera que llegó, para no vibrar por redondeo. */
const SNAP_EPSILON = 0.3;

/** Suaviza la posición del spotlight: en vez de saltar al elemento nuevo, «planea»
 *  hacia él con un filtro exponencial, cuadro a cuadro, igual de suave sin
 *  importar la distancia. Con movimiento reducido, salta directo. */
export function useSmoothedRect(target: TourTargetRect | null): TourTargetRect | null {
  const [display, setDisplay] = useState<TourTargetRect | null>(target);
  const displayRef = useRef<TourTargetRect | null>(target);
  const targetRef = useRef<TourTargetRect | null>(target);
  useEffect(() => {
    targetRef.current = target;
  });

  useEffect(() => {
    let rafId = 0;
    const loop = () => {
      const t = targetRef.current;
      const d = displayRef.current;

      if (t && (!d || prefersReducedMotion())) {
        if (d !== t) {
          displayRef.current = t;
          setDisplay(t);
        }
      } else if (t && d) {
        const dTop = t.top - d.top;
        const dLeft = t.left - d.left;
        const dWidth = t.width - d.width;
        const dHeight = t.height - d.height;
        const settled =
          Math.abs(dTop) < SNAP_EPSILON &&
          Math.abs(dLeft) < SNAP_EPSILON &&
          Math.abs(dWidth) < SNAP_EPSILON &&
          Math.abs(dHeight) < SNAP_EPSILON;
        const next = settled
          ? t
          : {
              top: d.top + dTop * SMOOTHING,
              left: d.left + dLeft * SMOOTHING,
              width: d.width + dWidth * SMOOTHING,
              height: d.height + dHeight * SMOOTHING,
            };
        displayRef.current = next;
        setDisplay(next);
      } else if (!t && d) {
        displayRef.current = null;
        setDisplay(null);
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return display;
}
