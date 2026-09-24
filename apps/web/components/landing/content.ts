// Copy de la landing comercial. Fuente: docs/01_comercial_agrodata.md y
// docs/08_ui-landing.md. Regla: nada de rayas largas; hablar como el productor.

export const DEMO_CTA_LABEL = "Pedir demo";
export const SIGN_IN_LABEL = "Ingresar";

export const HERO = {
  title: "Todo lo que pasa en tu campo, ordenado desde WhatsApp.",
  subtitle:
    "Un mensaje, un audio o la foto de una factura. AgroData lo convierte en datos listos para consultar y exportar.",
  secondaryCta: "Ver cómo funciona",
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
  body: "Cambiás de establecimiento en un clic. Cada persona ve solo lo que le toca.",
  roles: [
    {
      id: "owner",
      name: "Dueño",
      summary: "Ve y administra todos los campos, el equipo y la facturación.",
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

export const SHOWCASE = {
  title: "Un dashboard pensado para el campo",
  tabs: [
    { id: "resumen", label: "Resumen", caption: "KPIs, actividad reciente y alertas de stock." },
    { id: "potreros", label: "Potreros", caption: "Hectáreas, cultivos y animales por potrero." },
    { id: "tareas", label: "Tareas", caption: "Siembra, pulverización, fertilización y sanidad." },
    { id: "gastos", label: "Gastos", caption: "Distribución por categoría y tendencia mensual." },
    { id: "insumos", label: "Insumos", caption: "Stock por categoría con alertas de faltante." },
    { id: "equipo", label: "Equipo", caption: "Roles por campo e invitaciones por WhatsApp." },
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
        "Comparás campos y consolidás reportes en minutos",
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
        "Reportes claros para cada productor",
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
  subtitle: "Precios de lanzamiento, en dólares por mes.",
  plans: [
    {
      id: "campo",
      name: "Campo",
      audience: "Para un establecimiento",
      monthly: 29,
      custom: false,
      highlighted: false,
      features: [
        "1 campo",
        "Hasta 5 personas cargando por WhatsApp",
        "Dashboard completo",
        "Exportación a Excel",
      ],
    },
    {
      id: "profesional",
      name: "Profesional",
      audience: "Para agrónomos y veterinarios",
      monthly: 79,
      custom: false,
      highlighted: true,
      features: [
        "Hasta 10 campos",
        "Personas ilimitadas por WhatsApp",
        "Reportes semanales automáticos",
        "Exportación a Excel y PDF",
        "Consultas por chat en lenguaje natural",
      ],
    },
    {
      id: "empresa",
      name: "Empresa",
      audience: "Para grupos y administradoras",
      monthly: null,
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
      a: "Sí. Con una sola cuenta administrás todos tus establecimientos y cambiás de uno a otro en un clic.",
    },
    {
      id: "datos",
      q: "¿Los datos son míos?",
      a: "Siempre. Exportás todo a Excel o PDF cuando quieras, y si dejás de usar AgroData te llevás tu información.",
    },
  ],
};

export const CTA = {
  titleStart: "Ordená tus",
  rotatingWords: ["siembras", "animales", "gastos", "facturas"],
  titleEnd: "desde esta semana",
  body: "Dejanos tus datos y te mostramos AgroData funcionando con un caso de tu campo.",
  profileOptions: [
    { value: "AGRONOMO", label: "Ingeniero agrónomo" },
    { value: "VETERINARIO", label: "Veterinario" },
    { value: "PRODUCTOR", label: "Productor" },
    { value: "OTRO", label: "Otro" },
  ],
  fieldCountOptions: [
    { value: "1", label: "1 campo" },
    { value: "2-5", label: "De 2 a 5 campos" },
    { value: "6-10", label: "De 6 a 10 campos" },
    { value: "10+", label: "Más de 10 campos" },
  ],
};

export const FOOTER = {
  tagline: "Menos tiempo procesando. Más tiempo decidiendo.",
  columns: [
    {
      title: "Producto",
      links: [
        { href: "#como-funciona", label: "Cómo funciona" },
        { href: "#producto", label: "Dashboard" },
        { href: "#precios", label: "Precios" },
      ],
    },
    {
      title: "Cuenta",
      links: [
        { href: "/dashboard/sign-in", label: "Ingresar" },
        { href: "/dashboard/register", label: "Crear cuenta" },
      ],
    },
  ],
};
