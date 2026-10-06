/** Id interno de cada acceso anticipado (`AccessInvite.token`). Desde el paso a Clerk ya no se
 *  tipea ni va en el link: el link es la invitación de Clerk. Puro. */

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
