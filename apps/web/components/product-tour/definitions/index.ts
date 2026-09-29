import type { TourId } from "../tour-ids";
import type { TourDefinition } from "../types";
import { exportStep, step, type TourContext } from "./shared";
import { buildShellSteps, SHELL_GROUP_LABELS } from "./shell-steps";

/**
 * Las guías de AgroData: una por pantalla, cada una autocontenida. Los pasos
 * apuntan a elementos con `data-tour` en cada pantalla; si uno no se ve al
 * arrancar (depende del rol o de los datos), el motor lo descarta (ver
 * `dropMissingTargets` en `engine.tsx`). Agregar una guía es sumar una
 * entrada acá, un id en `tour-ids.ts` y los `data-tour` en la pantalla.
 */

const EXPORT_LABELS = { export: "Exportar a Excel" };

const inicio: TourDefinition<TourContext> = {
  id: "inicio",
  title: "Cómo empezar",
  intro: "los tres pasos para dejar tu campo andando: potreros, datos y equipo.",
  autoStart: true,
  buildSteps: (ctx) => [
    ...buildShellSteps(ctx),
    step(
      "inicio.steps",
      "inicio.steps",
      "Primero los potreros; después los primeros datos y tu equipo (esos dos pasos se habilitan cuando hay potreros).",
      { title: "Tres pasos", placement: "bottom" },
    ),
    step(
      "inicio.steps",
      "inicio.current",
      "El paso en el que estás. Los potreros los cargás uno por uno, desde un Excel o con el KMZ de Google Earth.",
      { placement: "top" },
    ),
  ],
  groupLabels: { ...SHELL_GROUP_LABELS, "inicio.steps": "Los tres pasos" },
};

const resumen: TourDefinition<TourContext> = {
  id: "resumen",
  title: "Resumen",
  intro: "los números de tu campo de un vistazo: avisos, indicadores y lo último que se cargó.",
  autoStart: true,
  buildSteps: () => [
    step(
      "resumen.alerts",
      "resumen.alerts",
      "Lo que conviene mirar hoy: stock que se acaba, sanidad por vencer, tareas atrasadas o un gasto fuera de lo normal. Cada aviso dice de qué datos sale.",
      { title: "Avisos", placement: "bottom" },
    ),
    step(
      "resumen.numbers",
      "resumen.period",
      "Los registros, las ventas y los gastos se filtran por período; potreros, animales y stock muestran cómo están hoy.",
      { title: "Período", placement: "bottom" },
    ),
    step("resumen.numbers", "resumen.kpis", "Datos cargados, ventas, compras, lluvia y mortandad del período.", {
      title: "Indicadores",
      placement: "bottom",
    }),
    step("resumen.recent", "resumen.recent", "Lo último que se cargó, por WhatsApp o desde la web.", {
      title: "Últimos datos",
      placement: "top",
    }),
    step(
      "resumen.report",
      "resumen.report",
      "Un informe en PDF del mes o de la campaña, con tu comentario y tu firma, listo para mandar.",
      { title: "Informe", placement: "bottom" },
    ),
  ],
  groupLabels: {
    "resumen.alerts": "Avisos",
    "resumen.numbers": "Período e indicadores",
    "resumen.recent": "Últimos datos",
    "resumen.report": "Informe en PDF",
  },
};

const cartera: TourDefinition<TourContext> = {
  id: "cartera",
  title: "Cartera",
  intro: "todos tus campos en una tabla, para comparar márgenes, kilos, litros y avisos.",
  autoStart: true,
  buildSteps: () => [
    step("cartera.fields", "cartera.kpis", "Cuántos campos llevás, la campaña en curso y los avisos de toda la cartera.", {
      title: "Tu cartera",
      placement: "bottom",
    }),
    step(
      "cartera.fields",
      "cartera.table",
      "Un campo por fila: tu rol, margen por hectárea de la campaña, ganancia diaria, litros por vaca, gastos del mes, lo que vence y los avisos.",
      { placement: "top" },
    ),
    step(
      "cartera.fields",
      "cartera.row-actions",
      "«Informe» arma el PDF de ese campo; «Entrar» te lleva a trabajar en él.",
      { placement: "left" },
    ),
    step("cartera.compare", "cartera.compare", "Los campos comparados entre sí, cuando hay datos para comparar.", {
      title: "Comparativos",
      placement: "top",
    }),
  ],
  groupLabels: { "cartera.fields": "Tus campos", "cartera.compare": "Comparativos" },
};

const potreros: TourDefinition<TourContext> = {
  id: "potreros",
  title: "Potreros",
  intro: "los lotes del campo con su superficie, sus cultivos y su hacienda.",
  autoStart: true,
  buildSteps: () => [
    step(
      "potreros.list",
      "potreros.add",
      "Sumá un potrero con su superficie. Si tenés muchos, importalos juntos desde Cómo empezar (Excel o KMZ).",
      { title: "Agregar potrero", placement: "bottom" },
    ),
    step(
      "potreros.list",
      "potreros.table",
      "Cada potrero con sus cultivos y animales. «Descanso» cuenta los días desde que salió la hacienda.",
      { placement: "top" },
    ),
    step(
      "potreros.list",
      "potreros.quick-add",
      "Con el + sumás un cultivo o animales sin abrir el potrero. Al sembrar se abre la campaña, para después ver el margen del lote.",
      { placement: "bottom" },
    ),
    exportStep("los potreros"),
  ],
  groupLabels: { "potreros.list": "Tus potreros", ...EXPORT_LABELS },
};

const tareas: TourDefinition<TourContext> = {
  id: "tareas",
  title: "Tareas",
  intro: "las órdenes de trabajo del campo: sanidad, siembra, pulverización y fertilización.",
  autoStart: true,
  buildSteps: () => [
    step(
      "tareas.new",
      "tareas.new",
      "Elegí el tipo: tratamiento sanitario, orden de siembra, pulverización o fertilización. Se la asignás a alguien del equipo, con fecha límite.",
      { title: "Nueva tarea", placement: "bottom" },
    ),
    step("tareas.list", "tareas.tabs", "«Mis tareas» muestra solo las que tenés asignadas.", { title: "Tus tareas", placement: "bottom" }),
    step("tareas.list", "tareas.progress", "Cuántas están hechas.", { placement: "bottom" }),
    step(
      "tareas.list",
      "tareas.pending",
      "Las pendientes, con su fecha límite (en rojo si se pasó). Tocá el círculo para marcarla hecha. Lo que se carga por WhatsApp llega ya completo.",
      { placement: "top" },
    ),
    exportStep("las tareas"),
  ],
  groupLabels: { "tareas.new": "Nueva tarea", "tareas.list": "Pendientes y hechas", ...EXPORT_LABELS },
};

const gastos: TourDefinition<TourContext> = {
  id: "gastos",
  title: "Gastos",
  intro: "todo lo que se gasta en el campo, en pesos y en dólares, por categoría y mes a mes.",
  autoStart: true,
  buildSteps: () => [
    step("gastos.filters", "gastos.filters", "Filtrá por moneda y por fechas. Pesos y dólares nunca se suman entre sí.", {
      title: "Filtros",
      placement: "bottom",
    }),
    step(
      "gastos.load",
      "gastos.new",
      "Un gasto con su categoría, monto, IVA y, si es de un lote, su campaña. Las facturas que mandás por WhatsApp se cargan solas.",
      { title: "Nuevo gasto", placement: "bottom" },
    ),
    step("gastos.view", "gastos.charts", "Los gastos por categoría y mes a mes.", { title: "Gráficos", placement: "top" }),
    step("gastos.view", "gastos.table", "El detalle, con búsqueda. Editás o borrás según tu rol.", { placement: "top" }),
    exportStep("los gastos (con los filtros que elegiste)"),
  ],
  groupLabels: { "gastos.filters": "Filtros", "gastos.load": "Cargar un gasto", "gastos.view": "Gráficos y detalle", ...EXPORT_LABELS },
};

const insumos: TourDefinition<TourContext> = {
  id: "insumos",
  title: "Insumos",
  intro: "el stock del campo: cuánto hay, cuánto cuesta y cómo se mueve.",
  autoStart: true,
  buildSteps: () => [
    step("insumos.stock", "insumos.kpis", "Cuántos insumos hay y cuáles están por acabarse.", { title: "Tu stock", placement: "bottom" }),
    step("insumos.stock", "insumos.new", "Sumá un insumo con su unidad, su costo y, si querés, un mínimo para que te avise.", {
      placement: "bottom",
    }),
    step(
      "insumos.moves",
      "insumos.movements",
      "+ registra un ingreso (con precio, actualiza el costo) y − un consumo, que podés aplicar a un lote. Por WhatsApp: «usé 150 litros de gasoil».",
      { title: "Movimientos", placement: "left" },
    ),
    step("insumos.moves", "insumos.history", "El historial del insumo: cada movimiento con su saldo y su costo.", { placement: "left" }),
    exportStep("el stock y sus movimientos"),
  ],
  groupLabels: { "insumos.stock": "Tu stock", "insumos.moves": "Ingresos y consumos", ...EXPORT_LABELS },
};

const economia: TourDefinition<TourContext> = {
  id: "economia",
  title: "Economía",
  intro: "cuánto te dejó cada lote: costos, ingresos y margen bruto en dólares.",
  autoStart: true,
  buildSteps: () => [
    step(
      "economia.setup",
      "economia.toolbar",
      "Elegí el ciclo. Los costos van con o sin IVA según tu condición y al dólar que elegiste en Preferencias.",
      { title: "Ciclo y dólar", placement: "bottom" },
    ),
    step("economia.setup", "economia.new", "Las campañas se abren solas al sembrar; acá abrís una a mano.", { placement: "bottom" }),
    step(
      "economia.results",
      "economia.empty",
      "Se abren solas cuando sembrás. Desde ahí, cada aplicación, gasto del lote, cosecha y venta suma a su margen.",
      { title: "Tus campañas", placement: "top" },
    ),
    step("economia.results", "economia.kpis", "Hectáreas, costos directos, ingresos y margen bruto del ciclo.", {
      title: "Tus campañas",
      placement: "bottom",
    }),
    step(
      "economia.results",
      "economia.table",
      "Cada campaña con su costo por hectárea, rinde, rinde de indiferencia y margen.",
      { placement: "top" },
    ),
    step(
      "economia.results",
      "economia.detail",
      "Abrí una campaña para ver cada costo e ingreso con el dólar que se usó, y cargar la cosecha y la venta.",
      { placement: "left" },
    ),
    exportStep("la economía del ciclo"),
  ],
  groupLabels: { "economia.setup": "Ciclo y campañas", "economia.results": "Margen por lote", ...EXPORT_LABELS },
};

const ganaderia: TourDefinition<TourContext> = {
  id: "ganaderia",
  title: "Ganadería",
  intro: "los kilos, la ganancia diaria y la reproducción de tu hacienda.",
  autoStart: true,
  buildSteps: () => [
    step(
      "ganaderia.weighings",
      "ganaderia.load",
      "Cargá una pesada o importá la planilla de la balanza. Por WhatsApp: «pesé 40 terneros del corral 1, promedio 180 kg».",
      { title: "Pesadas", placement: "bottom" },
    ),
    step("ganaderia.weighings", "ganaderia.kpis", "Cabezas, grupos pesados y la ganancia diaria (ADPV) promedio.", { placement: "bottom" }),
    step(
      "ganaderia.weighings",
      "ganaderia.table",
      "Cada grupo (una categoría en un potrero) con su última pesada, su ADPV y la carga por hectárea.",
      { placement: "top" },
    ),
    step("ganaderia.repro", "ganaderia.repro", "Servicio, tacto y destete por rodeo: la preñez y la parición de cada temporada.", {
      title: "Reproducción",
      placement: "top",
    }),
    exportStep("las pesadas y la reproducción"),
  ],
  groupLabels: { "ganaderia.weighings": "Pesadas y ADPV", "ganaderia.repro": "Reproducción", ...EXPORT_LABELS },
};

const tambo: TourDefinition<TourContext> = {
  id: "tambo",
  title: "Tambo",
  intro: "los litros, el precio y el margen sobre alimentación.",
  autoStart: true,
  buildSteps: () => [
    step("tambo.period", "tambo.period", "El período que querés mirar.", { title: "Período", placement: "bottom" }),
    step(
      "tambo.load",
      "tambo.settlement",
      "La liquidación de la usina da el precio por litro. La cargás acá o mandás la foto por WhatsApp.",
      { title: "Liquidaciones", placement: "bottom" },
    ),
    step(
      "tambo.numbers",
      "tambo.kpis",
      "Litros, litros por vaca, precio, costo del alimento y margen por litro. El alimento sale de los consumos de insumos de alimentación.",
      { title: "Números del tambo", placement: "bottom" },
    ),
    step("tambo.numbers", "tambo.daily", "Los litros de cada día. Por WhatsApp: «hoy 3.200 litros, 140 vacas en ordeñe».", {
      placement: "top",
    }),
    exportStep("el tambo del período"),
  ],
  groupLabels: { "tambo.period": "Período", "tambo.load": "Liquidaciones", "tambo.numbers": "Litros y margen", ...EXPORT_LABELS },
};

const datos: TourDefinition<TourContext> = {
  id: "datos",
  title: "Datos",
  intro: "el historial de todo lo que se cargó, por WhatsApp y desde la web.",
  autoStart: true,
  buildSteps: () => [
    step("datos.list", "datos.tabs", "«Mis datos» muestra solo lo que cargaste vos.", { title: "El historial", placement: "bottom" }),
    step(
      "datos.list",
      "datos.empty",
      "Acá va a aparecer tu primer mensaje por WhatsApp, con lo que entendió AgroData y lo que cargó.",
      { placement: "top" },
    ),
    step("datos.list", "datos.table", "Cada registro con su fecha, qué es, de dónde vino y quién lo cargó.", { placement: "top" }),
    step(
      "datos.list",
      "datos.row-actions",
      "Ver muestra el mensaje original y qué se cargó; Editar corrige la fecha y la descripción; Borrar, según tu rol.",
      { placement: "left" },
    ),
    exportStep("el historial"),
  ],
  groupLabels: { "datos.list": "El historial", ...EXPORT_LABELS },
};

const equipo: TourDefinition<TourContext> = {
  id: "equipo",
  title: "Equipo",
  intro: "quién trabaja en cada campo y qué puede hacer cada uno.",
  autoStart: true,
  buildSteps: () => [
    step("equipo.roles", "equipo.roles", "Los cuatro roles. Un campo siempre tiene dueño; los operarios usan solo WhatsApp.", {
      title: "Roles",
      placement: "bottom",
    }),
    step("equipo.members", "equipo.invite", "Invitá por email o por WhatsApp y elegí su rol en cada campo.", {
      title: "Invitar",
      placement: "bottom",
    }),
    step("equipo.members", "equipo.section", "Un bloque por campo, con quién está y su rol.", { placement: "top" }),
    step(
      "equipo.members",
      "equipo.member-actions",
      "Cambiar el rol, sacar a alguien del campo o pasarle la titularidad, según lo que tu rol permita.",
      { placement: "left" },
    ),
  ],
  groupLabels: { "equipo.roles": "Roles", "equipo.members": "Invitar y manejar el equipo" },
};

const preferencias: TourDefinition<TourContext> = {
  id: "preferencias",
  title: "Preferencias",
  intro: "la configuración del campo y de los avisos.",
  autoStart: true,
  buildSteps: () => [
    step("preferencias.lists", "preferencias.tabs", "Cada pestaña es una lista del campo: animales, rodeos, cultivos, insumos y gastos.", {
      title: "Las listas del campo",
      placement: "bottom",
    }),
    step(
      "preferencias.lists",
      "preferencias.campo",
      "El campo: nombre, actividades (definen qué módulos ves), el dólar para la economía y la condición de IVA.",
      { placement: "top", onEnter: "showFieldTab" },
    ),
    step(
      "preferencias.alerts",
      "preferencias.alerts",
      "Qué avisos querés y desde qué valor, y si te llegan por WhatsApp. Lo tuyo lo apagás vos; lo del campo lo configuran el dueño y el encargado.",
      { title: "Avisos", placement: "top", onEnter: "showAlertsTab" },
    ),
  ],
  groupLabels: { "preferencias.lists": "El campo y sus listas", "preferencias.alerts": "Avisos" },
};

export const tourRegistry: Record<TourId, TourDefinition<TourContext>> = {
  inicio,
  resumen,
  cartera,
  potreros,
  tareas,
  gastos,
  insumos,
  economia,
  ganaderia,
  tambo,
  datos,
  equipo,
  preferencias,
};

export type { TourContext };
