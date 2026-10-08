import { useSyncExternalStore } from "react";

/**
 * Si la media query se cumple. En el servidor y durante la hidratación devuelve
 * `serverValue` (así no hay mismatch) y recién después el valor real.
 */
export function useMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}
