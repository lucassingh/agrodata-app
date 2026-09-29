import type { TourPlacement, TourStep } from "../types";

/** Lo que las guías necesitan saber de la persona para no armar pasos que no aplican. */
export interface TourContext {
  /** Tiene dos o más campos con acceso web (ve la Cartera). */
  multiField: boolean;
}

/** Un paso: el id es el target (único dentro de cada guía). */
export const step = (
  groupId: string,
  target: string,
  body: string,
  extra: { title?: string; placement?: TourPlacement; onEnter?: string; unionWith?: string; clearWith?: string } = {},
): TourStep => ({ id: target, groupId, target, body, ...extra });

/** El botón «Exportar a Excel», común a los módulos. */
export const exportStep = (what: string): TourStep =>
  step("export", "page.export", `Bajá ${what} a Excel cuando quieras, para compartirlo o trabajarlo aparte.`, {
    title: "Exportar a Excel",
    placement: "bottom",
  });
