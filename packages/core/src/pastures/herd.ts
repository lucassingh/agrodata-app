import { normalizeEntityName } from "../whatsapp/entity-name";

export interface HerdLine {
  animalType: string;
  quantity: number;
}

/** Diferencia entre la hacienda de un potrero antes y después de editarlo, por
 *  tipo de animal (mismo nombre normalizado = mismo tipo). Solo lo que cambió. */
export function herdDiff(before: HerdLine[], after: HerdLine[]): { animalType: string; delta: number }[] {
  const totals = new Map<string, { animalType: string; delta: number }>();
  const add = (line: HerdLine, sign: 1 | -1) => {
    const key = normalizeEntityName(line.animalType);
    const entry = totals.get(key) ?? { animalType: line.animalType, delta: 0 };
    entry.delta += sign * line.quantity;
    if (sign === 1) entry.animalType = line.animalType;
    totals.set(key, entry);
  };
  before.forEach((line) => add(line, -1));
  after.forEach((line) => add(line, 1));
  return [...totals.values()].filter((entry) => entry.delta !== 0);
}

/** Movimientos que sacan hacienda de un potrero. */
export const OUTFLOW_TYPES = ["SALE", "DEATH", "TRANSFER_OUT", "ADJUSTMENT_OUT"] as const;

/** Días de descanso: solo si el potrero está vacío y se sabe cuándo salió la
 *  última hacienda. `null` si está ocupado o no hay datos. */
export function restDays(animalsNow: number, lastOutflow: Date | null, now: Date): number | null {
  if (animalsNow > 0 || !lastOutflow) return null;
  return Math.max(0, Math.floor((now.getTime() - lastOutflow.getTime()) / 86_400_000));
}
