/** Cuentas de la Cartera (Etapa 4): un número por campo para comparar entre campos.
 *  Puro: se testea sin base. */

const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;

/** Margen por hectárea del ciclo: suma de márgenes ÷ suma de hectáreas de las
 *  campañas con superficie (así un lote chico no pesa como uno grande). */
export function seasonMarginPerHa(
  campaigns: { hectares: number | null; marginUsd: number }[],
): { marginUsd: number; hectares: number; marginPerHaUsd: number | null } {
  const withHa = campaigns.filter((c) => c.hectares && c.hectares > 0);
  const hectares = withHa.reduce((sum, c) => sum + c.hectares!, 0);
  const marginUsd = withHa.reduce((sum, c) => sum + c.marginUsd, 0);
  return {
    marginUsd: round(marginUsd, 2),
    hectares: round(hectares, 2),
    marginPerHaUsd: hectares > 0 ? round(marginUsd / hectares, 2) : null,
  };
}

/** ADPV del campo: promedio de los grupos con ADPV, ponderado por cabezas (un
 *  grupo sin cabezas informadas pesa 1). */
export function averageAdpv(groups: { adpv: number | null; headCount: number | null }[]): number | null {
  const withAdpv = groups.filter((g) => g.adpv !== null);
  if (withAdpv.length === 0) return null;
  const weight = (g: { headCount: number | null }) => (g.headCount && g.headCount > 0 ? g.headCount : 1);
  const total = withAdpv.reduce((sum, g) => sum + weight(g), 0);
  return round(withAdpv.reduce((sum, g) => sum + g.adpv! * weight(g), 0) / total, 2);
}

export interface Comparable {
  tenantId: string;
  name: string;
  value: number | null;
}

/** Campos con dato, de mayor a menor, para los comparativos. */
export function ranking(rows: Comparable[]): { tenantId: string; name: string; value: number }[] {
  return rows
    .filter((r): r is { tenantId: string; name: string; value: number } => r.value !== null)
    .sort((a, b) => b.value - a.value);
}
