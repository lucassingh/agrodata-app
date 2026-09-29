"use client";

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";

interface SidebarContextValue {
  /** Menú angosto (solo íconos), en pantallas grandes. */
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  /** Menú abierto encima del contenido, en celular. */
  mobileOpen: boolean;
  setMobileOpen: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar debe usarse dentro de SidebarProvider");
  return ctx;
}

const DESKTOP_QUERY = "(min-width: 768px)";

/** Si la pantalla es de escritorio en este momento. Para código que corre después
 *  (por ejemplo, una acción del tour guardada al cargar la página), donde el valor
 *  de `useIsDesktop` del primer render puede ser el del servidor. */
export const isDesktopNow = (): boolean => window.matchMedia(DESKTOP_QUERY).matches;

/** Si la pantalla es de escritorio (md de Tailwind). En el servidor se asume que
 *  sí; en celular se corrige apenas carga la página. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(DESKTOP_QUERY);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );
}
