import JSZip from "jszip";
import type { ParsedPastureRow } from "./parse-spreadsheet";

/** Puerto de `handleKmzUpload`/`parseKmzKml` del legacy. Solo lee el `<name>`
 *  de cada `Placemark` -- nunca extrae hectáreas ni geometría (la polygon real
 *  se ignora por completo), igual que el legacy. */
export async function parseKmzKmlFile(file: File): Promise<ParsedPastureRow[]> {
  let text: string;
  if (file.name.toLowerCase().endsWith(".kmz")) {
    const zip = await JSZip.loadAsync(file);
    const kmlEntryName = Object.keys(zip.files).find((name) => name.toLowerCase().endsWith(".kml"));
    if (!kmlEntryName) {
      throw new Error("El archivo KMZ no contiene un archivo KML válido.");
    }
    text = await zip.files[kmlEntryName]!.async("string");
  } else {
    text = await file.text();
  }

  const doc = new DOMParser().parseFromString(text, "text/xml");
  const placemarks = Array.from(doc.querySelectorAll("Placemark"));
  const rows: ParsedPastureRow[] = [];
  for (const placemark of placemarks) {
    const name = placemark.querySelector("name")?.textContent?.trim();
    if (name) rows.push({ name });
  }
  return rows;
}
