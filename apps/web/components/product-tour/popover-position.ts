import type { TourPlacement } from "./types";

/** Dónde va el cartel del paso respecto del elemento resaltado. Reemplaza al
 *  Popper de MUI del original: mismo lado pedido, se da vuelta si no entra
 *  (flip) y nunca se sale de la pantalla (preventOverflow). Puro. */

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Distancia entre el elemento y el cartel. */
export const POPOVER_OFFSET = 16;
/** Margen mínimo contra los bordes de la pantalla. */
export const VIEWPORT_PADDING = 16;

type Side = "top" | "bottom" | "left" | "right";

const OPPOSITE: Record<Side, Side> = { top: "bottom", bottom: "top", left: "right", right: "left" };

const sideOf = (placement: TourPlacement): Side => placement.replace("-start", "") as Side;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

function positionOn(side: Side, anchor: Box, size: Size, alignStart: boolean) {
  switch (side) {
    case "bottom":
      return { top: anchor.top + anchor.height + POPOVER_OFFSET, left: alignStart ? anchor.left : anchor.left + (anchor.width - size.width) / 2 };
    case "top":
      return { top: anchor.top - POPOVER_OFFSET - size.height, left: alignStart ? anchor.left : anchor.left + (anchor.width - size.width) / 2 };
    case "right":
      return { top: alignStart ? anchor.top : anchor.top + (anchor.height - size.height) / 2, left: anchor.left + anchor.width + POPOVER_OFFSET };
    case "left":
      return { top: alignStart ? anchor.top : anchor.top + (anchor.height - size.height) / 2, left: anchor.left - POPOVER_OFFSET - size.width };
  }
}

/** Si el cartel entra de ese lado sin tapar el elemento ni salirse de la pantalla. */
function fits(side: Side, anchor: Box, size: Size, viewport: Size): boolean {
  switch (side) {
    case "bottom":
      return anchor.top + anchor.height + POPOVER_OFFSET + size.height <= viewport.height - VIEWPORT_PADDING;
    case "top":
      return anchor.top - POPOVER_OFFSET - size.height >= VIEWPORT_PADDING;
    case "right":
      return anchor.left + anchor.width + POPOVER_OFFSET + size.width <= viewport.width - VIEWPORT_PADDING;
    case "left":
      return anchor.left - POPOVER_OFFSET - size.width >= VIEWPORT_PADDING;
  }
}

export function placePopover(anchor: Box, size: Size, placement: TourPlacement, viewport: Size): { top: number; left: number; side: Side } {
  const preferred = sideOf(placement);
  const candidates: Side[] = [preferred, OPPOSITE[preferred], "bottom", "top", "right", "left"];
  const side = candidates.find((s) => fits(s, anchor, size, viewport)) ?? preferred;
  // Como el Popper original: al darse vuelta conserva la alineación («bottom-start» → «top-start»).
  const raw = positionOn(side, anchor, size, placement.endsWith("-start"));
  return {
    side,
    top: clamp(raw.top, VIEWPORT_PADDING, viewport.height - size.height - VIEWPORT_PADDING),
    left: clamp(raw.left, VIEWPORT_PADDING, viewport.width - size.width - VIEWPORT_PADDING),
  };
}
