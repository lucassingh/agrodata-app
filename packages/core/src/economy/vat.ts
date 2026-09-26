/** IVA para la economía por lote. Puro: se testea sin base.
 *
 *  Alícuotas sugeridas según la práctica general del agro argentino: son un
 *  punto de partida editable en cada gasto, no asesoramiento impositivo (hay
 *  exenciones y regímenes especiales que tiene que confirmar un contador). */

export type VatCondition = "RESPONSABLE_INSCRIPTO" | "MONOTRIBUTISTA";

export const VAT_RATES = [0.21, 0.105, 0.27, 0] as const;

export const VAT_RATE_LABEL: Record<string, string> = {
  "0.21": "21 %",
  "0.105": "10,5 %",
  "0.27": "27 %",
  "0": "Exento",
};

export const VAT_CONDITION_LABEL: Record<VatCondition, string> = {
  RESPONSABLE_INSCRIPTO: "Responsable inscripto",
  MONOTRIBUTISTA: "Monotributista",
};

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** 10,5 %: bienes de capital, labores de contratistas, fertilizantes, granos y hacienda. */
const REDUCED = [
  "maquin",
  "tractor",
  "sembradora",
  "cosechadora",
  "pulverizadora",
  "implemento",
  "labor",
  "contratist",
  "servicio de siembra",
  "servicio de cosecha",
  "servicio de pulverizacion",
  "siembra",
  "cosecha",
  "fertiliz",
  "urea",
  "semilla",
  "grano",
  "hacienda",
  "animal",
  "novill",
  "ternero",
  "vaca",
];

/** 27 %: servicios públicos (a un responsable inscripto). */
const INCREASED = ["luz", "electric", "energia", "gas natural", "telefon", "internet", "agua corriente"];

/** Alícuota sugerida para un gasto o insumo a partir de su categoría o nombre. */
export function suggestVatRate(...names: (string | null | undefined)[]): number {
  const text = normalize(names.filter(Boolean).join(" "));
  if (INCREASED.some((word) => text.includes(word))) return 0.27;
  if (REDUCED.some((word) => text.includes(word))) return 0.105;
  return 0.21;
}

/** Parte neta (sin IVA) de un importe. `includesVat` = el importe cargado ya tiene el IVA. */
export function netOfVat(amount: number, includesVat: boolean, rate: number): number {
  return includesVat && rate > 0 ? Math.round((amount / (1 + rate)) * 100) / 100 : amount;
}

/** Costo para la economía del campo: un responsable inscripto recupera el IVA
 *  (cuenta el neto); un monotributista no (cuenta el neto más el IVA). */
export function costForCondition(net: number, rate: number | null, condition: VatCondition): number {
  if (condition === "RESPONSABLE_INSCRIPTO" || !rate) return net;
  return Math.round(net * (1 + rate) * 100) / 100;
}
