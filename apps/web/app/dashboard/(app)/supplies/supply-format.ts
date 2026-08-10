import type { Supply } from "./types";

export const LOW_STOCK_THRESHOLD = 5;

/** Paleta + hash determinístico del legacy (`accentForCategory` en SuppliesPage.tsx):
 *  las categorías nunca reciben un `color` propio desde la UI (el form de Preferencias
 *  no tiene ese campo), así que el color visible siempre sale de este hash sobre el id. */
const ACCENT_PALETTE = [
  "#2D6A4F",
  "#0F766E",
  "#7C3AED",
  "#D97706",
  "#C4453A",
  "#0369A1",
  "#DB2777",
  "#059669",
];

export function accentForCategory(categoryId: string, color?: string | null): string {
  if (color && color.trim()) return color.trim();
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = (hash + categoryId.charCodeAt(i)) % ACCENT_PALETTE.length;
  }
  return ACCENT_PALETTE[hash]!;
}

export function isLowStock(supply: Pick<Supply, "quantity">): boolean {
  return supply.quantity <= LOW_STOCK_THRESHOLD;
}

export function formatQuantity(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2);
}

export function formatCost(supply: Pick<Supply, "cost" | "currency">): string {
  if (supply.cost == null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: supply.currency,
    maximumFractionDigits: 2,
  }).format(supply.cost);
}
