import type { TourStep } from "../types";
import { step, type TourContext } from "./shared";

/** Los pasos del marco del dashboard (menú y barra de arriba), comunes a todo.
 *  En el celular el menú es un cajón: `openMenu` lo abre y, al salir de cada
 *  grupo, `exitGroup:<grupo>` lo cierra. */
export function buildShellSteps(ctx: TourContext): TourStep[] {
  return [
    step(
      "shell.field",
      "shell.field",
      "Todo lo que ves y cargás es de este campo. Si tenés varios, lo cambiás desde tu nombre, arriba a la derecha.",
      { title: "Tu campo", placement: "right-start", onEnter: "openMenu" },
    ),
    step(
      "shell.menu",
      "shell.menu.campo",
      "El día a día: el Resumen con los números y los avisos, y Datos, con todo lo que se cargó.",
      { title: "Campo", placement: "right-start", onEnter: "openMenu" },
    ),
    ...(ctx.multiField
      ? [
          step("shell.menu", "shell.menu.item.portfolio", "Todos tus campos comparados en una pantalla, con el informe de cada uno.", {
            title: "Cartera",
            placement: "right-start",
          }),
        ]
      : []),
    step(
      "shell.menu",
      "shell.menu.gestion",
      "Un módulo por tema: potreros, tareas, gastos, insumos y, según las actividades del campo, economía, ganadería y tambo.",
      { title: "Gestión", placement: "right-start" },
    ),
    step("shell.menu", "shell.menu.configuracion", "Tu equipo, las preferencias del campo y tu plan.", {
      title: "Configuración",
      placement: "right-start",
    }),
    step(
      "shell.whatsapp",
      "shell.menu.item.data",
      "Lo más rápido es cargar por WhatsApp: un mensaje, un audio o la foto de una factura, como «cargué 200 litros de gasoil en el tractor». Campia lo carga en Gastos, Insumos o Potreros, y el mensaje queda acá, en Datos, para revisarlo.",
      { title: "Tu primer mensaje por WhatsApp", placement: "right-start", onEnter: "openMenu" },
    ),
    step(
      "shell.header",
      "shell.header.guide",
      "Cada pantalla tiene su guía. La abrís acá cuando quieras, completa o por sección.",
      { title: "Ver guía", placement: "bottom" },
    ),
    // Solo con la prueba vigente y en pantallas anchas; si no se ve, el motor lo descarta.
    step("shell.header", "shell.header.trial", "Los días de prueba gratis que te quedan. Tocalo para ver los planes.", {
      title: "Tu prueba",
      placement: "bottom",
    }),
    step("shell.header", "shell.header.user", "Cambiás de campo, agregás uno nuevo, ves tu plan y cerrás sesión.", {
      title: "Tu cuenta",
      placement: "bottom",
    }),
  ];
}

export const SHELL_GROUP_LABELS: Record<string, string> = {
  "shell.field": "Tu campo",
  "shell.menu": "El menú",
  "shell.whatsapp": "Tu primer mensaje por WhatsApp",
  "shell.header": "La barra de arriba",
};
