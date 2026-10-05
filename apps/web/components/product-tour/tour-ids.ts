/** Las guías de Campia, una por pantalla. Sin "use client": lo usa también la
 *  acción del servidor que guarda el avance, para validar el id. */
export const TOUR_PATHS = {
  inicio: "/dashboard/how-start",
  resumen: "/dashboard/summary",
  cartera: "/dashboard/portfolio",
  potreros: "/dashboard/pastures",
  tareas: "/dashboard/tasks",
  gastos: "/dashboard/expenses",
  insumos: "/dashboard/supplies",
  economia: "/dashboard/economy",
  ganaderia: "/dashboard/livestock",
  tambo: "/dashboard/dairy",
  datos: "/dashboard/data",
  equipo: "/dashboard/team",
  preferencias: "/dashboard/preferences",
} as const;

export type TourId = keyof typeof TOUR_PATHS;

export const TOUR_IDS = Object.keys(TOUR_PATHS) as TourId[];

export const isTourId = (value: string): value is TourId => (TOUR_IDS as string[]).includes(value);

/** La guía de la pantalla (null si no tiene: Mi plan, Mapa, Soporte). */
export function tourIdForPath(pathname: string): TourId | null {
  const clean = pathname.replace(/\/+$/, "");
  return TOUR_IDS.find((id) => TOUR_PATHS[id] === clean) ?? null;
}
