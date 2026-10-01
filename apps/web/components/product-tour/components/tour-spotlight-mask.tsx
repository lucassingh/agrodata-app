"use client";

import { TOUR_OVERLAY_Z_INDEX } from "../config";
import type { TourTargetRect } from "../hooks/use-tour-target";

const PADDING = 8;
const RADIUS = 12;
/** Tamaño mínimo del agujero: un ícono de 36 px queda con aire alrededor. */
const MIN_HOLE_SIZE = 56;
const MASK_ID = "agrodata-tour-spotlight-mask";

const pad = (rect: TourTargetRect) => {
  const padTop = Math.max((MIN_HOLE_SIZE - rect.height) / 2, PADDING);
  const padLeft = Math.max((MIN_HOLE_SIZE - rect.width) / 2, PADDING);
  return {
    top: Math.max(rect.top - padTop, 0),
    left: Math.max(rect.left - padLeft, 0),
    width: rect.width + padLeft * 2,
    height: rect.height + padTop * 2,
  };
};

/**
 * El spotlight: una sola capa con desenfoque y velo, con un agujero recortado por
 * una máscara SVG, más un anillo verde alrededor del elemento. (Con cuatro franjas
 * separadas, en agujeros chicos se veía una costura en las esquinas; una capa
 * continua no la tiene.) `holeRect` y `ringRect` difieren cuando el paso usa
 * `clearWith`: se despeja una zona grande pero el anillo marca el elemento puntual.
 */
export function TourSpotlightMask({ holeRect, ringRect }: { holeRect: TourTargetRect | null; ringRect: TourTargetRect | null }) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  const hole = holeRect ? pad(holeRect) : null;
  const ring = ringRect ? pad(ringRect) : null;

  return (
    <>
      {hole ? (
        <svg width="0" height="0" className="absolute" aria-hidden>
          <defs>
            <mask id={MASK_ID} maskUnits="userSpaceOnUse" x={0} y={0} width={vw} height={vh}>
              <rect x={0} y={0} width={vw} height={vh} fill="white" />
              <rect x={hole.left} y={hole.top} width={hole.width} height={hole.height} rx={RADIUS} fill="black" />
            </mask>
          </defs>
        </svg>
      ) : null}
      <div
        aria-hidden
        className="fixed inset-0 bg-[rgba(27,67,50,0.22)] backdrop-blur-[2px]"
        style={{
          zIndex: TOUR_OVERLAY_Z_INDEX,
          mask: hole ? `url(#${MASK_ID})` : undefined,
          WebkitMask: hole ? `url(#${MASK_ID})` : undefined,
        }}
      />
      {ring ? (
        <div
          aria-hidden
          className="pointer-events-none fixed border-2 border-primary/70 shadow-[0_0_0_3px_rgba(45,106,79,0.16),0_0_16px_rgba(45,106,79,0.25)]"
          style={{
            zIndex: TOUR_OVERLAY_Z_INDEX + 1,
            top: ring.top,
            left: ring.left,
            width: ring.width,
            height: ring.height,
            borderRadius: RADIUS,
          }}
        />
      ) : null}
    </>
  );
}
