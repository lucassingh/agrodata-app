"use client";

import { useEffect, useRef, useState } from "react";
import { TOUR_TARGET_POLL_MS, TOUR_TARGET_WAIT_MS } from "../config";
import { prefersReducedMotion } from "../reduced-motion";

export interface TourTargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TourTargetResult {
  /** Target (+ `unionWith`): lo usan el anillo y el cartel. */
  rect: TourTargetRect | null;
  /** Agujero del desenfoque: `rect` unido a la zona `clearWith`, o igual a `rect`. */
  clearRect: TourTargetRect | null;
  /** A qué `target` corresponde `rect` ahora. Mientras se resuelve el paso nuevo
   *  sigue siendo el anterior: el overlay no cambia el texto hasta que coinciden. */
  resolvedFor: string | null;
}

const measure = (el: Element): TourTargetRect => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

/** El rect que envuelve a todos. */
const union = (rects: TourTargetRect[]): TourTargetRect => {
  const top = Math.min(...rects.map((r) => r.top));
  const left = Math.min(...rects.map((r) => r.left));
  const bottom = Math.max(...rects.map((r) => r.top + r.height));
  const right = Math.max(...rects.map((r) => r.left + r.width));
  return { top, left, width: right - left, height: bottom - top };
};

const VIEWPORT_MARGIN = 24;

/** El primer elemento con ese `data-tour` que se ve (con `display: none` no tiene
 *  cajas): varias filas comparten target y una versión puede estar oculta en el
 *  celular. */
export function findVisibleTarget(target: string): Element | null {
  if (typeof document === "undefined") return null;
  return Array.from(document.querySelectorAll(`[data-tour="${target}"]`)).find((el) => el.getClientRects().length > 0) ?? null;
}

/** Si ya se ve bien, no se scrollea: evita un salto en cada paso. */
const isReasonablyVisible = (r: TourTargetRect): boolean =>
  r.top >= VIEWPORT_MARGIN &&
  r.top + r.height <= window.innerHeight - VIEWPORT_MARGIN &&
  r.left >= 0 &&
  r.left + r.width <= window.innerWidth;

/**
 * Busca `[data-tour="target"]` y sigue su posición mientras el paso está activo
 * (un loop de animación: cubre scroll, cambios de tamaño y el cajón del menú
 * abriéndose). Con `unionWith` el rect envuelve además a los elementos con
 * `data-tour-group~="unionWith"`; con `clearWith`, calcula aparte el agujero del
 * desenfoque. Si el elemento no aparece en `TOUR_TARGET_WAIT_MS`, o desaparece
 * (cambió la página), llama a `onNotFound` (el overlay saltea el paso).
 */
export function useTourTarget(
  target: string | null,
  unionWith: string | undefined,
  clearWith: string | undefined,
  onNotFound: () => void,
): TourTargetResult {
  const [state, setState] = useState<TourTargetResult>({ rect: null, clearRect: null, resolvedFor: null });
  const onNotFoundRef = useRef(onNotFound);
  useEffect(() => {
    onNotFoundRef.current = onNotFound;
  });

  useEffect(() => {
    if (!target) {
      setState({ rect: null, clearRect: null, resolvedFor: null });
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let pollId = 0;
    // `~=` busca una palabra en una lista separada por espacios: un elemento
    // puede pertenecer a varios grupos a la vez.
    const groupSelector = unionWith ? `[data-tour-group~="${unionWith}"]` : null;
    const clearGroupSelector = clearWith ? `[data-tour-group~="${clearWith}"]` : null;
    // No se vuelve a null: se sigue mostrando el paso anterior hasta resolver este.

    const measureAll = (el: Element): TourTargetRect => {
      if (!groupSelector) return measure(el);
      const groupEls = Array.from(document.querySelectorAll(groupSelector));
      return groupEls.length > 0 ? union([measure(el), ...groupEls.map(measure)]) : measure(el);
    };

    const measureClear = (rect: TourTargetRect): TourTargetRect => {
      if (!clearGroupSelector) return rect;
      const clearEls = Array.from(document.querySelectorAll(clearGroupSelector));
      return clearEls.length > 0 ? union([rect, ...clearEls.map(measure)]) : rect;
    };

    const startTracking = (el: Element) => {
      // Se revela recién cuando el rect queda quieto unos cuadros seguidos: si el
      // paso abrió algo (el menú del celular, una sección), todavía se está
      // moviendo, y el spotlight lo perseguiría cuadro a cuadro.
      let lastRect: TourTargetRect | null = null;
      let stableFrames = 0;
      let revealed = false;

      const loop = () => {
        if (cancelled) return;
        if (!el.isConnected) {
          onNotFoundRef.current();
          return;
        }
        const r = measureAll(el);
        const isStable =
          !!lastRect &&
          Math.abs(r.top - lastRect.top) < 0.5 &&
          Math.abs(r.left - lastRect.left) < 0.5 &&
          Math.abs(r.width - lastRect.width) < 0.5 &&
          Math.abs(r.height - lastRect.height) < 0.5;
        stableFrames = isStable ? stableFrames + 1 : 0;
        lastRect = r;

        if (!revealed) {
          if (stableFrames >= 3) {
            revealed = true;
            setState({ rect: r, clearRect: measureClear(r), resolvedFor: target });
            if (!isReasonablyVisible(r)) {
              el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center", inline: "nearest" });
            }
          }
        } else {
          // Ya revelado: sigue en vivo (scroll, cambio de tamaño, el cajón animando).
          setState({ rect: r, clearRect: measureClear(r), resolvedFor: target });
        }
        rafId = requestAnimationFrame(loop);
      };
      loop();
    };

    const found = findVisibleTarget(target);
    if (found) {
      startTracking(found);
    } else {
      const startedAt = Date.now();
      const poll = () => {
        if (cancelled) return;
        const el = findVisibleTarget(target);
        if (el) {
          startTracking(el);
          return;
        }
        if (Date.now() - startedAt >= TOUR_TARGET_WAIT_MS) {
          onNotFoundRef.current();
          return;
        }
        pollId = window.setTimeout(poll, TOUR_TARGET_POLL_MS);
      };
      pollId = window.setTimeout(poll, TOUR_TARGET_POLL_MS);
    }

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (pollId) window.clearTimeout(pollId);
    };
  }, [target, unionWith, clearWith]);

  return state;
}
