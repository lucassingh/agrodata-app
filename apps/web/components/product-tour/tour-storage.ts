"use client";

import { markTourSeenAction } from "@/app/dashboard/(app)/_lib/tour-actions";
import type { TourStorageAdapter } from "./types";

/**
 * Persistencia del tour en la base (tabla `tours_seen`), así no se repite al
 * cambiar de computadora o de celular. El motor pregunta en forma sincrónica:
 * la lista llega del servidor con el layout (`hydrate`) y se guarda acá; marcar
 * es optimista (la guía no se vuelve a ofrecer en esta sesión aunque la red
 * tarde) y se manda a la base sin esperar.
 */
let seen = new Set<string>();
let hydratedFor: string | null = null;

export const tourStorage: TourStorageAdapter & { hydrate(userId: string, tourIds: string[]): void } = {
  /** Idempotente por persona: si cambia la sesión, se reemplaza la lista. */
  hydrate(userId, tourIds) {
    if (hydratedFor === userId) return;
    hydratedFor = userId;
    seen = new Set(tourIds);
  },
  hasSeenTour: (tourId) => seen.has(tourId),
  hasSeenAnyTour: () => seen.size > 0,
  markSeen(tourId) {
    if (seen.has(tourId)) return;
    seen.add(tourId);
    // Si falla la red, la guía se vuelve a ofrecer la próxima vez: no corta nada.
    markTourSeenAction(tourId).catch(() => {});
  },
};
