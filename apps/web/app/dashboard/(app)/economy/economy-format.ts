/** Sin "use client": lo usan la página, los diálogos y la exportación. */
export type CampaignStatus = "IN_PROGRESS" | "HARVESTED" | "CLOSED";

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  IN_PROGRESS: "En curso",
  HARVESTED: "Cosechada",
  CLOSED: "Cerrada",
};

const number = (value: number, digits = 0) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);

export function formatUsd(value: number | null, digits = 0): string {
  return value === null ? "—" : `US$ ${number(value, digits)}`;
}

export function formatArs(value: number | null): string {
  return value === null ? "—" : `$ ${number(value)}`;
}

export function formatMoney(value: number, currency: "ARS" | "USD"): string {
  return currency === "USD" ? formatUsd(value, 2) : `$ ${number(value, 2)}`;
}

export function formatKg(value: number | null, suffix = "kg"): string {
  return value === null ? "—" : `${number(value)} ${suffix}`;
}

export function formatDay(isoDay: string | null): string {
  if (!isoDay) return "—";
  return `${isoDay.slice(8, 10)}/${isoDay.slice(5, 7)}/${isoDay.slice(0, 4)}`;
}
