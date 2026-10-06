/** «Juan Carlos Pérez» → nombre «Juan Carlos», apellido «Pérez». Con una sola palabra, sin
 *  apellido. Vacío: `null`. Puro, con tests. */
export function splitFullName(raw: string): { name: string; lastname: string } | null {
  const words = raw.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  if (words.length === 1) return { name: words[0]!, lastname: "" };
  return { name: words.slice(0, -1).join(" "), lastname: words[words.length - 1]! };
}
