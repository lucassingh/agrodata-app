import * as XLSX from "xlsx";
import type { WeighingRow } from "@repo/core/livestock/livestock-math";

export interface ParsedWeighings {
  rows: WeighingRow[];
  /** Filas descartadas, con el número de fila de la planilla y el motivo. */
  skipped: { line: number; reason: string }[];
}

function normalizeHeader(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s*\(.*\)\s*/g, "");
}

function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) if (row[key] !== undefined && row[key] !== "") return row[key];
  return undefined;
}

/** Fecha de una celda: número de serie de Excel, dd/mm/aaaa o aaaa-mm-dd. */
function parseDay(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(Math.round((value - 25569) * 86_400_000)).toISOString().slice(0, 10);
  }
  const text = String(value ?? "").trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const local = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(text);
  if (local) {
    const year = local[3]!.length === 2 ? `20${local[3]}` : local[3]!;
    return `${year}-${local[2]!.padStart(2, "0")}-${local[1]!.padStart(2, "0")}`;
  }
  return null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value ?? "").trim().replace(/\./g, "").replace(",", ".");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** Lee la primera hoja de una planilla de pesadas. Una fila sin fecha usa `defaultDay`. */
export async function parseWeighingsFile(file: File, defaultDay: string): Promise<ParsedWeighings> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!sheet) return { rows: [], skipped: [] };
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: true, defval: "" });

  const rows: WeighingRow[] = [];
  const skipped: ParsedWeighings["skipped"] = [];
  raw.forEach((original, index) => {
    const line = index + 2; // la fila 1 son los encabezados
    const row: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(original)) row[normalizeHeader(key)] = value;

    const pasture = String(pick(row, "potrero", "corral", "lote") ?? "").trim();
    const animalType = String(pick(row, "categoria", "tipo", "categoria de animal") ?? "").trim();
    const kg = parseNumber(pick(row, "peso", "kg", "peso promedio", "kilos"));
    const heads = parseNumber(pick(row, "cantidad", "cabezas"));
    const rawDay = pick(row, "fecha", "dia");
    const day = rawDay === undefined ? defaultDay : parseDay(rawDay);

    if (!pasture && !animalType && kg === null) return; // fila vacía
    if (!pasture) return void skipped.push({ line, reason: "falta el potrero" });
    if (!animalType) return void skipped.push({ line, reason: "falta la categoría" });
    if (kg === null || kg <= 0) return void skipped.push({ line, reason: "falta el peso" });
    if (!day) return void skipped.push({ line, reason: "la fecha no se entiende" });
    rows.push({ pasture, animalType, day, kg, headCount: heads !== null && heads > 0 ? Math.round(heads) : null });
  });
  return { rows, skipped };
}
