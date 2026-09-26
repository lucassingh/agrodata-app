/** Port verbatim de frontend/src/utils/tenantLabels.ts */

export type TenantCategoryCode = "FIELD_AGRICOLA" | "GANADERO" | "TAMBO" | "MIXTO";

export const TENANT_CATEGORY_LABELS: Record<TenantCategoryCode, string> = {
  FIELD_AGRICOLA: "Agricola",
  GANADERO: "Ganadero",
  TAMBO: "Tambo",
  MIXTO: "Mixto",
};

export function tenantCategoryLabel(code: string): string {
  return TENANT_CATEGORY_LABELS[code as TenantCategoryCode] ?? code;
}

export const TENANT_TIMEZONES = [
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (Buenos Aires)" },
  { value: "America/Argentina/Cordoba", label: "Argentina (Cordoba)" },
  { value: "America/Argentina/Mendoza", label: "Argentina (Mendoza)" },
  { value: "America/Santiago", label: "Chile (Santiago)" },
  { value: "America/Montevideo", label: "Uruguay (Montevideo)" },
  { value: "UTC", label: "UTC" },
] as const;

export const BASE_CURRENCIES = [
  { value: "ARS", label: "Peso argentino (ARS)" },
  { value: "USD", label: "Dolar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "BRL", label: "Real (BRL)" },
] as const;

export const PROFILE_TYPE_LABEL: Record<string, string> = {
  AGRONOMO: "Agrónomo",
  VETERINARIO: "Veterinario",
  PRODUCTOR: "Productor",
  ADMINISTRATIVO: "Administrativo",
  OTRO: "Usuario",
};

/** Actividades de un campo: se eligen juntas (agricultura, ganadería, tambo, o
 *  cualquier combinación) y definen qué módulos se ven en el dashboard. */
export const FARM_ACTIVITIES = ["AGRICULTURA", "GANADERIA", "TAMBO"] as const;
export type FarmActivity = (typeof FARM_ACTIVITIES)[number];

export const FARM_ACTIVITY_LABEL: Record<FarmActivity, string> = {
  AGRICULTURA: "Agricultura",
  GANADERIA: "Ganadería",
  TAMBO: "Tambo",
};

export const FARM_ACTIVITY_HINT: Record<FarmActivity, string> = {
  AGRICULTURA: "Cultivos, campañas y margen por lote",
  GANADERIA: "Pesadas, aumento de peso y reproducción",
  TAMBO: "Litros, liquidaciones y margen por litro",
};

/** Actividades de un campo creado antes de que existieran (a partir del rubro). */
export function activitiesFromCategory(category: string): FarmActivity[] {
  switch (category) {
    case "FIELD_AGRICOLA":
      return ["AGRICULTURA"];
    case "GANADERO":
      return ["GANADERIA"];
    case "TAMBO":
      return ["TAMBO"];
    default:
      return [...FARM_ACTIVITIES];
  }
}

/** Rubro equivalente (el campo `category` del legacy): una actividad, esa; varias, Mixto. */
export function categoryFromActivities(activities: readonly FarmActivity[]): TenantCategoryCode {
  if (activities.length !== 1) return "MIXTO";
  return { AGRICULTURA: "FIELD_AGRICOLA", GANADERIA: "GANADERO", TAMBO: "TAMBO" }[activities[0]!] as TenantCategoryCode;
}

/** Módulos específicos que se ven según las actividades. El tambo incluye
 *  Ganadería: tiene reproducción (servicio, tacto, partos) y recría de terneros. */
export function visibleModules(activities: readonly string[]) {
  return {
    economy: activities.includes("AGRICULTURA"),
    livestock: activities.includes("GANADERIA") || activities.includes("TAMBO"),
    dairy: activities.includes("TAMBO"),
  };
}

/** «Agricultura y Tambo», para mostrar. */
export function activitiesLabel(activities: readonly string[]): string {
  const names = FARM_ACTIVITIES.filter((a) => activities.includes(a)).map((a) => FARM_ACTIVITY_LABEL[a]);
  if (names.length <= 1) return names[0] ?? "Sin actividades";
  return `${names.slice(0, -1).join(", ")} y ${names.at(-1)}`;
}
