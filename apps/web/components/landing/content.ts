// Copy de la landing comercial. Fuente: docs/01_comercial_agrodata.md y
// docs/08_ui-landing.md. Regla: nada de rayas largas; hablar como el productor.

import { PLANS, TRIAL_DAYS } from "@repo/core/billing/plans";
import { DEMO_FIELD_COUNT_LABEL, DEMO_PROFILE_LABEL } from "@repo/core/leads/demo-request.schema";

export const DEMO_CTA_LABEL = "Pedir demo";
/** La prueba gratis: registro con 14 días del plan Asesor, sin tarjeta. */
export const TRIAL_CTA_LABEL = `Probar gratis ${TRIAL_DAYS} días`;
export const TRIAL_HREF = "/dashboard/register";
export const SIGN_IN_LABEL = "Ingresar";

export const HERO = {
  title: "Todo lo que pasa en tu campo, ordenado desde WhatsApp.",
  subtitle:
    "Un mensaje, un audio o la foto de una factura. AgroData lo convierte en datos ordenados, listos para consultar y exportar.",
  trialNote: "Sin tarjeta. Si no te sirve, no pagás nada.",
};

/** Escenas que se reproducen en loop en el teléfono del hero (datos de ejemplo). */
export const HERO_SCENES = [
  {
    id: "siembra",
    kind: "text" as const,
    message: "Sembré 100 ha de soja en el potrero Norte ayer",
    fieldId: "norte",
    record: {
      type: "Siembra",
      lines: [
        ["Potrero", "Norte"],
        ["Cultivo", "Soja"],
        ["Superficie", "100 ha"],
        ["Fecha", "Ayer"],
      ],
    },
    reply: "Listo. Registré la siembra de soja en el potrero Norte (100 ha).",
  },
  {
    id: "sanidad",
    kind: "audio" as const,
    message: "Vacunamos 45 terneros en el bajo contra aftosa",
    audioLength: "0:09",
    fieldId: "bajo",
    record: {
      type: "Sanidad",
      lines: [
        ["Potrero", "El Bajo"],
        ["Animales", "45 terneros"],
        ["Tratamiento", "Aftosa"],
        ["Fecha", "Hoy"],
      ],
    },
    reply: "Anotado: vacunación de 45 terneros en El Bajo.",
  },
  {
    id: "gasto",
    kind: "photo" as const,
    message: "Factura de la urea para el lote Oeste",
    fieldId: "oeste",
    record: {
      type: "Gasto",
      lines: [
        ["Proveedor", "Agro Pampa SRL"],
        ["Categoría", "Fertilizantes"],
        ["Monto", "$ 1.284.500"],
        ["Lote", "Oeste"],
      ],
    },
    reply: "Cargué la factura de Agro Pampa SRL por $ 1.284.500 en Fertilizantes, lote Oeste.",
  },
];

export const ACTIVITIES = [
  "Agricultura",
  "Ganadería",
  "Tambo",
  "Campos mixtos",
  "Siembra",
  "Sanidad animal",
  "Pulverización",
  "Fertilización",
  "Insumos y stock",
  "Gastos y facturas",
  "Equipos de campo",
];

export const PROBLEM = {
  statement:
    "Cuadernos en la camioneta. Fotos de facturas perdidas en el celular. Audios que nadie vuelve a escuchar. Planillas que nadie actualiza.",
  promise: "Menos tiempo procesando. Más tiempo decidiendo.",
  scraps: [
    { label: "Cuaderno de campo", detail: "Lote 4, pulverizado el martes (?)" },
    { label: "Foto de factura", detail: "IMG_20250914_183012.jpg" },
    { label: "Audio de WhatsApp", detail: "0:47 · sin escuchar" },
    { label: "Planilla", detail: "stock_final_v3_ESTA.xlsx" },
  ],
};

export const HOW_IT_WORKS = {
  title: "Del mensaje al dato, sin pasos en el medio",
  steps: [
    {
      title: "Mandás",
      body: "Texto, audio o la foto de una factura, al mismo WhatsApp de siempre. Vos o cualquiera de tu equipo.",
    },
    {
      title: "La IA lo entiende y te confirma",
      body: "Identifica qué pasó, dónde y cuánto. Si le falta un dato, te pregunta antes de guardar algo dudoso.",
    },
    {
      title: "Queda en tu dashboard",
      body: "El registro aparece ordenado por campo y por potrero, listo para consultar, corregir o exportar.",
    },
  ],
};

export const FEATURES_TITLE = "Todo el campo, en un solo lugar";

export const MULTI_FIELD = {
  title: "Varios campos, un solo equipo",
  body: "Cambiás de establecimiento en un clic. Cada persona tiene su rol en cada campo y ve solo lo que le toca.",
  roles: [
    {
      id: "owner",
      name: "Dueño",
      summary: "Administra sus campos, su equipo y la facturación.",
      channel: "Web y WhatsApp",
      fields: ["esperanza", "ombu", "sanmartin", "alamos"],
    },
    {
      id: "manager",
      name: "Encargado",
      summary: "Gestiona los campos que tiene a cargo e invita a su equipo.",
      channel: "Web y WhatsApp",
      fields: ["esperanza", "ombu"],
    },
    {
      id: "advisor",
      name: "Asesor",
      summary: "Atiende los campos de sus clientes: los compara y arma el informe de cada uno.",
      channel: "Web y WhatsApp",
      fields: ["ombu", "sanmartin", "alamos"],
    },
    {
      id: "operator",
      name: "Operario",
      summary: "Carga lo que pasa en su campo. No necesita usuario web.",
      channel: "Solo WhatsApp",
      fields: ["esperanza"],
    },
  ],
  fields: [
    { id: "esperanza", name: "La Esperanza" },
    { id: "ombu", name: "El Ombú" },
    { id: "sanmartin", name: "San Martín" },
    { id: "alamos", name: "Los Álamos" },
  ],
};

/** Capturas reales del dashboard (cuenta demo de develop, `db:seed:demo`), en public/landing/dashboard/. */
export const SHOWCASE = {
  title: "Un dashboard pensado para el campo",
  subtitle: "Capturas reales de un campo mixto: agricultura, cría, feedlot y tambo.",
  tabs: [
    { id: "resumen", label: "Resumen", caption: "Avisos del día, indicadores del campo y lo último que se cargó." },
    { id: "datos", label: "Datos", caption: "Todo lo que llegó por WhatsApp y por la web, con quién lo cargó." },
    { id: "potreros", label: "Potreros", caption: "Cada lote con su superficie, cultivos, hacienda y días de descanso." },
    { id: "tareas", label: "Tareas", caption: "Siembra, pulverización, fertilización y sanidad, con responsable y fecha." },
    { id: "gastos", label: "Gastos", caption: "Por categoría y mes a mes, en pesos y en dólares por separado." },
    { id: "insumos", label: "Insumos", caption: "Stock con su historial, costo y lo que se movió en el último mes." },
    { id: "ganaderia", label: "Ganadería", caption: "Pesadas, aumento diario de peso, carga por hectárea y reproducción." },
    { id: "tambo", label: "Tambo", caption: "Litros por día y por vaca, precio de la liquidación y margen por litro." },
  ],
};

export const ALERTS = {
  eyebrow: "Avisos",
  title: "Te avisa antes de que te cueste plata.",
  body: "AgroData mira los datos que cargás todos los días y te avisa lo que conviene resolver: en el Resumen y, a primera hora, por WhatsApp. Cada aviso dice de qué datos sale.",
  kinds: [
    { title: "Stock que se acaba", body: "Al ritmo de consumo del último mes, cuántos días te quedan de gasoil, balanceado o urea." },
    { title: "Sanidad por vencer", body: "Vacunas y tratamientos que vencen esta semana o que ya se pasaron." },
    { title: "Kilos y litros que caen", body: "Un grupo que engorda menos que en la pesada anterior, o litros por vaca en baja." },
    { title: "Gastos fuera de lo normal", body: "Una categoría que este mes gasta bastante más que su promedio." },
  ],
  imageAlt:
    "Panel de avisos de AgroData: gasoil para 6 días, urea debajo del mínimo, vacunación aftosa por vencer, una pulverización vencida y dos categorías de gasto fuera de lo normal.",
};

export const ADVISOR = {
  eyebrow: "Para asesores",
  title: "Todos tus clientes en una pantalla. Y el informe, en un clic.",
  body: "La Cartera compara tus campos: ganancia diaria, litros por vaca, gastos del mes, lo que vence y los avisos de cada uno. Desde ahí armás el informe en PDF de cualquier cliente, con tu comentario y tu firma.",
  points: [
    "Cargás por WhatsApp nombrando el campo, sin cambiar de cuenta.",
    "Informe del mes o de la campaña, listo para mandar.",
    "Cada cliente sigue siendo dueño de sus datos.",
  ],
  portfolioAlt: "La Cartera de AgroData con tres campos de un asesor: ganancia diaria, litros por vaca, gastos del mes y avisos.",
  reportAlt: "Primera página de un informe de campo en PDF: gastos por categoría, pesadas y tambo del mes, preparado por el asesor.",
};

/** AgroData contra una app de registro por WhatsApp, sin nombrar a nadie. */
export const COMPARISON = {
  title: "Registrar es el primer paso. Decidir es el que importa.",
  subtitle: "Lo que hace cualquier app de registro, y lo que suma AgroData.",
  columns: { us: "AgroData", them: "Una app de registro" },
  rows: [
    { label: "Carga por WhatsApp: texto, audio y fotos", them: true },
    { label: "Stock, tareas y gastos", them: true },
    { label: "Exportación a Excel", them: true },
    { label: "Margen bruto por lote, en dólares", them: false },
    { label: "Aumento diario de peso y reproducción", them: false },
    { label: "Litros por vaca y margen por litro", them: false },
    { label: "Cartera de clientes e informe en PDF para el asesor", them: false },
    { label: "Avisos antes de que el problema cueste plata", them: false },
  ],
};

export const PROFILES = {
  title: "Hecho para quien vive el campo",
  items: [
    {
      id: "agronomo",
      name: "Ingeniero agrónomo",
      headline: "Todos tus campos en una sola cuenta",
      body: "Seguí labores, insumos, stock y costos de cada establecimiento sin cambiar de usuario.",
      points: [
        "Comparás tus campos y mandás el informe mensual en PDF",
        "Tu equipo carga las labores desde WhatsApp",
        "Trazabilidad de cada pulverización y fertilización",
      ],
      sampleMessage: "Pulverizamos el lote 7 con glifosato, 2 l/ha",
      image: { src: "/landing/perfil-agronomo.jpg", width: 1400, height: 1049, alt: "Cultivo de colza en flor visto desde arriba, con los surcos de la sembradora marcados" },
    },
    {
      id: "veterinario",
      name: "Veterinario",
      headline: "La sanidad de cada tambo, al día",
      body: "Centralizá eventos sanitarios, productivos y gastos de todos los tambos que atendés.",
      points: [
        "Historial sanitario por rodeo y por establecimiento",
        "Nacimientos, tratamientos y vacunas cargados al momento",
        "Un informe en PDF para cada productor, con tu firma",
      ],
      sampleMessage: "Nacieron 3 terneras en el tambo 2, todas bien",
      image: { src: "/landing/perfil-veterinario.jpg", width: 1400, height: 933, alt: "Vacas Holando pastando en un campo verde a pleno sol" },
    },
    {
      id: "productor",
      name: "Productor",
      headline: "Tu campo ordenado, sin sentarte a cargar",
      body: "Lo que pasa en el campo queda registrado mientras trabajás. Vos solo mandás el mensaje.",
      points: [
        "Gastos y facturas ordenados por categoría",
        "Stock de insumos siempre actualizado",
        "Respuestas al instante: ¿cuánto gasoil usé este mes?",
      ],
      sampleMessage: "¿Cuánto gasoil usé este mes?",
      image: { src: "/landing/perfil-productor.jpg", width: 1400, height: 788, alt: "Productor revisando el celular parado en un campo de mostaza en flor" },
    },
  ],
};

export const PRICING = {
  title: "Un plan para cada escala",
  subtitle: `Precios de lanzamiento, en dólares por mes. Probalo gratis ${TRIAL_DAYS} días con todo el plan Asesor, sin tarjeta.`,
  plans: [
    {
      id: "campo",
      name: "Campo",
      audience: "Para un establecimiento",
      monthly: PLANS.CAMPO.monthlyUsd,
      custom: false,
      highlighted: false,
      features: [
        "1 campo",
        "Hasta 5 personas cargando por WhatsApp",
        "Dashboard completo",
        "Margen bruto por lote, en dólares",
        "Pesadas, ADPV, reproducción y tambo",
        "Exportación a Excel",
      ],
    },
    {
      id: "asesor",
      name: "Asesor",
      audience: "Para agrónomos y veterinarios con cartera",
      monthly: PLANS.ASESOR.monthlyUsd,
      custom: false,
      highlighted: true,
      features: [
        "Hasta 10 campos de tus clientes",
        "Cartera: todos tus campos y sus comparativos en una pantalla",
        "Informe en PDF por cliente, con tu firma y tu comentario",
        "Cargás por WhatsApp nombrando el campo",
        "Margen por lote, ADPV, preñez y margen por litro",
        "Personas ilimitadas por WhatsApp",
        "Reportes semanales, consultas por chat y Excel",
      ],
    },
    {
      id: "empresa",
      name: "Empresa",
      audience: "Para grupos y administradoras",
      monthly: PLANS.EMPRESA.monthlyUsd,
      custom: true,
      highlighted: false,
      features: [
        "Campos ilimitados",
        "Onboarding asistido con tu equipo",
        "Soporte prioritario",
        "Integraciones a medida",
      ],
    },
  ],
};

export const FAQ = {
  title: "Preguntas frecuentes",
  items: [
    {
      id: "instalar",
      q: "¿Tengo que instalar algo?",
      a: "No. Tu equipo usa el WhatsApp que ya tiene. El dashboard se abre desde cualquier navegador, en la compu o en el celular.",
    },
    {
      id: "error",
      q: "¿Qué pasa si la IA entiende mal un mensaje?",
      a: "Si le falta un dato o no está segura, te pregunta antes de guardar. Y desde el dashboard podés corregir cualquier registro.",
    },
    {
      id: "senal",
      q: "¿Funciona donde no hay señal?",
      a: "Sí. Mandás el mensaje como siempre y WhatsApp lo entrega cuando vuelve la señal. AgroData lo procesa en cuanto llega.",
    },
    {
      id: "operarios",
      q: "¿Mis operarios necesitan cuenta web?",
      a: "No. Los operarios solo cargan por WhatsApp. La web es para quien administra el campo.",
    },
    {
      id: "campos",
      q: "¿Puedo manejar varios campos?",
      a: "Sí. Con una sola cuenta ves todos tus campos y cambiás de uno a otro en un clic. Si asesorás a otros productores, ellos te suman a su campo (o lo creás vos y les pasás la titularidad) y los comparás a todos en la Cartera.",
    },
    {
      id: "datos",
      q: "¿Los datos son míos?",
      a: "Siempre. Exportás todo a Excel cuando quieras, y si dejás de usar AgroData te llevás tu información. Si querés, la borramos.",
    },
    {
      id: "prueba",
      q: "¿Cómo es la prueba gratis?",
      a: `${TRIAL_DAYS} días con todo el plan Asesor, sin tarjeta. Te registrás, cargás tus potreros y empezás a mandar mensajes. Una guía en cada pantalla te muestra cómo se usa.`,
    },
    {
      id: "fin-prueba",
      q: "¿Qué pasa cuando termina la prueba?",
      a: "Si no elegís un plan, tus campos quedan en modo lectura: ves y exportás todo, pero no se cargan datos nuevos. No se borra nada; cuando activás un plan, todo sigue donde estaba.",
    },
    {
      id: "pago",
      q: "¿Cómo se paga?",
      a: "Los precios están en dólares y se cobran en pesos al dólar oficial del día. Sin permanencia: das de baja cuando quieras.",
    },
  ],
};

export const CTA = {
  titleStart: "Ordená tus",
  rotatingWords: ["siembras", "animales", "gastos", "facturas"],
  titleEnd: "desde esta semana",
  body: "Dejanos tus datos y te mostramos AgroData funcionando con un caso de tu campo.",
  // Las mismas etiquetas que usa el email al equipo (core/leads/demo-request.schema.ts).
  profileOptions: Object.entries(DEMO_PROFILE_LABEL).map(([value, label]) => ({ value, label })),
  fieldCountOptions: Object.entries(DEMO_FIELD_COUNT_LABEL).map(([value, label]) => ({ value, label })),
};

export const FOOTER = {
  tagline: "Menos tiempo procesando. Más tiempo decidiendo.",
  columns: [
    {
      title: "Producto",
      links: [
        { href: "/#como-funciona", label: "Cómo funciona" },
        { href: "/#producto", label: "Dashboard" },
        { href: "/#precios", label: "Precios" },
      ],
    },
    {
      title: "Cuenta",
      links: [
        { href: "/dashboard/sign-in", label: "Ingresar" },
        { href: "/dashboard/register", label: "Crear cuenta" },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: "/terminos", label: "Términos y condiciones" },
        { href: "/privacidad", label: "Política de privacidad" },
      ],
    },
  ],
};

/** Datos del responsable que aparecen en Términos y Privacidad. Completar antes
 *  de publicar (los pide Meta para verificar la app de WhatsApp). */
export const LEGAL = {
  updatedAt: "25 de septiembre de 2026",
  responsible: "[Nombre o razón social del titular, CUIT]",
  contactEmail: "[email de contacto]",
};

export const LOT_MARGIN = {
  eyebrow: "Economía por lote",
  title: "Sabé cuánto te dejó cada lote, sin armar una planilla.",
  body: "Cada aplicación, labor y gasto que cargás por WhatsApp suma al costo de su lote. Cuando cosechás y vendés, AgroData te muestra el margen bruto, el costo por hectárea y el rinde que necesitás para no perder.",
  points: [
    { title: "Costos que llegan solos", body: "Insumos aplicados, contratistas y gastos del lote, sin cargar nada dos veces." },
    { title: "En dólares, al día", body: "Cada peso se convierte con el dólar de su fecha. Elegís mayorista, oficial o MEP." },
    { title: "Rinde de indiferencia", body: "Los kilos por hectárea que cubren tus costos, antes de cosechar." },
  ],
  example: {
    title: "Margen bruto por hectárea · ciclo 25/26",
    note: "Datos de ejemplo",
    lots: [
      { name: "Soja · La Loma", ha: 120, margin: 414 },
      { name: "Maíz · El Bajo", ha: 80, margin: 356 },
      { name: "Soja · Norte", ha: 150, margin: 298 },
      { name: "Trigo · Sur", ha: 60, margin: -38 },
    ],
    statsTitle: "Soja · La Loma, a US$ 300/t",
    stats: [
      { label: "Costo directo", value: "US$ 318/ha" },
      { label: "Rinde", value: "2.440 kg/ha" },
      { label: "Rinde de indiferencia", value: "1.060 kg/ha" },
    ],
  },
};

export const LIVESTOCK_DAIRY = {
  eyebrow: "Ganadería y tambo",
  title: "Kilos, preñez y litros: los números que definen si el campo gana plata.",
  body: "Mandá la pesada, el tacto o los litros del día por WhatsApp. AgroData calcula lo que un veterinario o un tambero mira todas las semanas, sin planillas aparte.",
  note: "Datos de ejemplo",
  cards: [
    {
      id: "ganaderia",
      title: "Engorde",
      stat: "0,85 kg/día",
      statLabel: "ADPV de los terneros del corral 1",
      points: ["Pesadas por grupo, por WhatsApp o con una planilla", "Kilos producidos por hectárea y carga", "Cada grupo con su evolución de peso"],
    },
    {
      id: "reproduccion",
      title: "Reproducción",
      stat: "85 %",
      statLabel: "de preñez en el tacto del rodeo de cría",
      points: ["Servicio, tacto, partos y destete", "Preñez, parición y destete por temporada", "La próxima dosis sanitaria queda agendada"],
    },
    {
      id: "tambo",
      title: "Tambo",
      stat: "$ 285 por litro",
      statLabel: "de margen sobre alimentación ($ 420 de precio − $ 135 de alimento)",
      points: ["Litros del día y litros por vaca", "Liquidación de la usina con una foto", "Grasa, proteína y precio por litro"],
    },
  ],
};
