/** Normaliza un nombre para compararlo: minúsculas, sin acentos, espacios
 *  colapsados. "  Combustíble " y "combustible" son el mismo nombre. */
export function normalizeEntityName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Busca una entidad del tenant por nombre, con coincidencia exacta sobre el
 *  nombre normalizado. A propósito NO hay matching aproximado ("combustible"
 *  vs "combustibles"): la elección semántica ya la hizo Claude contra la lista
 *  real, y es más seguro preguntar de más que cargar un dato en el lugar
 *  equivocado. */
export function findByNormalizedName<T extends { name: string }>(items: readonly T[], name: string): T | undefined {
  const target = normalizeEntityName(name);
  if (!target) return undefined;
  return items.find((item) => normalizeEntityName(item.name) === target);
}
