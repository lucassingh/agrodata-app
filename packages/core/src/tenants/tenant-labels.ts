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
