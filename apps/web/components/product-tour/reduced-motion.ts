/** Si la persona pidió menos movimiento en su sistema: el tour salta de un paso
 *  al otro sin planear ni scrollear suave. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
