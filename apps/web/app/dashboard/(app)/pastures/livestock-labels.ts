/** Sin "use client" a propósito: lo usan el detalle del potrero y la exportación a Excel. */
export type LivestockEventType =
  | "BIRTH"
  | "PURCHASE"
  | "SALE"
  | "DEATH"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT";

export const LIVESTOCK_EVENT_LABEL: Record<LivestockEventType, string> = {
  BIRTH: "Nacimiento",
  PURCHASE: "Compra",
  SALE: "Venta",
  DEATH: "Mortandad",
  TRANSFER_IN: "Entrada desde otro potrero",
  TRANSFER_OUT: "Salida a otro potrero",
  ADJUSTMENT_IN: "Alta manual",
  ADJUSTMENT_OUT: "Baja manual",
};

export const LIVESTOCK_INFLOW = new Set<LivestockEventType>(["BIRTH", "PURCHASE", "TRANSFER_IN", "ADJUSTMENT_IN"]);
