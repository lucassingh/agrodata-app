"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { isDesktopNow, useSidebar } from "@/context/sidebar-context";
import { createTourEngine } from "./create-tour-engine";
import { tourRegistry, type TourContext } from "./definitions";
import { tourIdForPath } from "./tour-ids";
import { tourStorage } from "./tour-storage";
import type { TourStartActions } from "./types";

/** La única instancia del motor en AgroData. */
const tourEngine = createTourEngine<TourContext>({ registry: tourRegistry, storage: tourStorage, dropMissingTargets: true });

/** Hace clic en un elemento del tour: para mostrar una pestaña antes de su paso. */
const clickTourTarget = (target: string) => {
  document.querySelector<HTMLElement>(`[data-tour="${target}"]`)?.click();
};

/**
 * Va en la barra de arriba: el botón «Ver guía» de la pantalla actual y el cartel
 * automático de la primera visita. También arma las acciones que usan los pasos
 * (abrir el menú en el celular, cambiar de pestaña).
 */
export function TourHost({ multiField }: { multiField: boolean }) {
  const pathname = usePathname();
  const tourId = tourIdForPath(pathname);
  const { setMobileOpen } = useSidebar();

  const ctx = useMemo<TourContext>(() => ({ multiField }), [multiField]);
  // El ancho se consulta al correr la acción, no al armarla: el cartel automático
  // guarda las acciones del primer render, cuando todavía se asume escritorio.
  const actions = useMemo<TourStartActions>(() => {
    const openMenu = () => {
      if (!isDesktopNow()) setMobileOpen(true);
    };
    const closeMenu = () => {
      if (!isDesktopNow()) setMobileOpen(false);
    };
    return {
      openMenu,
      "exitGroup:shell.field": closeMenu,
      "exitGroup:shell.menu": closeMenu,
      "exitGroup:shell.whatsapp": closeMenu,
      showFieldTab: () => clickTourTarget("preferencias.tab.campo"),
      showAlertsTab: () => clickTourTarget("preferencias.tab.avisos"),
    };
  }, [setMobileOpen]);

  // Pantalla sin guía: un id que no está en el registro, así el hook no hace nada.
  tourEngine.useTourAutoStart(tourId ?? "none", { ctx, actions, ready: tourId !== null });

  return tourId ? <tourEngine.TourGuideMenu tourId={tourId} ctx={ctx} actions={actions} /> : null;
}

/** Se monta una vez en el dashboard: el overlay y el cartel, con las guías que la
 *  persona ya vio (de la base). */
export function TourLayer({ userId, seenTours }: { userId: string; seenTours: string[] }) {
  // Antes de que las pantallas pregunten si la guía ya se vio.
  tourStorage.hydrate(userId, seenTours);
  return <tourEngine.ProductTourLayer />;
}
