/** Logo del asesor en el informe PDF: solo PNG o JPG (lo que dibuja el PDF), chico.
 *  Puro: se testea sin base. */

export const MAX_LOGO_BYTES = 500 * 1024;

export type LogoMimeType = "image/png" | "image/jpeg";

/** Por los primeros bytes, no por la extensión ni el tipo que manda el navegador. */
export function detectLogoType(bytes: Uint8Array): LogoMimeType | null {
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= png.length && png.every((b, i) => bytes[i] === b)) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

/** El motivo por el que no sirve, o null si sirve. */
export function logoProblem(bytes: Uint8Array): string | null {
  if (bytes.length === 0) return "Elegí una imagen.";
  if (bytes.length > MAX_LOGO_BYTES) return "El logo puede pesar hasta 500 KB.";
  if (!detectLogoType(bytes)) return "El logo tiene que ser PNG o JPG.";
  return null;
}

/** Para el PDF: `data:image/png;base64,…`. */
export const logoDataUri = (bytes: Uint8Array, mimeType: string) => `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
