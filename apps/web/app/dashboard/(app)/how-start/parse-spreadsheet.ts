import * as XLSX from "xlsx";

export interface ParsedPastureRow {
  name: string;
  hectares?: number;
}

function normalizeHeader(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Puerto de `parseSpreadsheetRows` del legacy: toma solo la primera hoja,
 *  resuelve `name` desde nombre/name/potrero/lote y `hectareas` desde
 *  hectareas/hectares/ha/superficie (primer match, sin distinguir mayúsculas
 *  ni acentos). Filas sin nombre se descartan en silencio, sin contador de
 *  cuántas se salteó -- así es el legacy. */
export async function parseSpreadsheetFile(file: File): Promise<ParsedPastureRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const result: ParsedPastureRow[] = [];
  for (const row of rows) {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeHeader(key)] = value;
    }
    const name = String(normalized.nombre ?? normalized.name ?? normalized.potrero ?? normalized.lote ?? "").trim();
    if (!name) continue;
    const rawHectares = normalized.hectareas ?? normalized.hectares ?? normalized.ha ?? normalized.superficie;
    const hectares = Number(rawHectares);
    result.push({ name, hectares: Number.isFinite(hectares) ? hectares : undefined });
  }
  return result;
}
