import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * Igual que `useReducedMotion` de Motion, pero hidrata sin mismatch: en el
 * servidor y durante la hidratación devuelve false, y recién después el valor
 * real. Motion ya frena transforms con `MotionConfig reducedMotion="user"`.
 */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
