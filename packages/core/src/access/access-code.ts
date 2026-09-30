/** Código de acceso anticipado: va en el link y también se puede tipear (llega por WhatsApp). Puro. */

// Sin 0/O ni 1/I/L: se dicta y se copia sin confundirse.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const GROUPS = 3;
const GROUP_LENGTH = 4;

/** `bytes` son aleatorios (en el servicio, `crypto.randomBytes`): 12 caracteres, unas 10^17 combinaciones. */
export function formatAccessCode(bytes: Uint8Array): string {
  const chars = Array.from({ length: GROUPS * GROUP_LENGTH }, (_, i) => ALPHABET[(bytes[i] ?? 0) % ALPHABET.length]!);
  return Array.from({ length: GROUPS }, (_, g) => chars.slice(g * GROUP_LENGTH, (g + 1) * GROUP_LENGTH).join("")).join("-");
}

export const ACCESS_CODE_BYTES = GROUPS * GROUP_LENGTH;

/** Como lo tipee la persona (minúsculas, espacios, sin guiones) → como se guarda. Null si no es un código. */
export function normalizeAccessCode(raw: string | null | undefined): string | null {
  const clean = (raw ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (clean.length !== GROUPS * GROUP_LENGTH || [...clean].some((c) => !ALPHABET.includes(c))) return null;
  return Array.from({ length: GROUPS }, (_, g) => clean.slice(g * GROUP_LENGTH, (g + 1) * GROUP_LENGTH)).join("-");
}
