const PALETTE = [
  "#2D6A4F",
  "#7C6445",
  "#3B7DC4",
  "#D4930D",
  "#C4453A",
  "#7C3AED",
  "#0F766E",
  "#D97706",
];

/** Asigna un color estable de la paleta a partir de un string (id o nombre),
 *  igual que el `colorForKey` del legacy. */
export function colorForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index]!;
}
