import { normalizeEntityName } from "./entity-name";

/** Sinónimos de unidad → forma canónica. Solo para COMPARAR unidades (¿el
 *  mensaje habla en la misma unidad en que se lleva el insumo?); lo que se
 *  muestra y se guarda sigue siendo la unidad tal cual la cargó el usuario. */
const UNIT_SYNONYMS: Record<string, string> = {
  l: "l",
  lt: "l",
  lts: "l",
  litro: "l",
  litros: "l",
  ml: "ml",
  cc: "ml",
  mililitro: "ml",
  mililitros: "ml",
  kg: "kg",
  kgs: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogramo: "kg",
  kilogramos: "kg",
  t: "tn",
  tn: "tn",
  tonelada: "tn",
  toneladas: "tn",
  bolsa: "bolsa",
  bolsas: "bolsa",
  bidon: "bidon",
  bidones: "bidon",
  dosis: "dosis",
  u: "unidad",
  un: "unidad",
  unidad: "unidad",
  unidades: "unidad",
};

export function canonicalUnit(unit: string | null): string | null {
  if (!unit) return null;
  const normalized = normalizeEntityName(unit).replace(/\.$/, "");
  if (!normalized) return null;
  return UNIT_SYNONYMS[normalized] ?? normalized;
}

/** true si las unidades son claramente distintas. Si falta alguna de las dos,
 *  no hay contra qué comparar y se acepta. */
export function unitsConflict(a: string | null, b: string | null): boolean {
  const left = canonicalUnit(a);
  const right = canonicalUnit(b);
  return left !== null && right !== null && left !== right;
}
