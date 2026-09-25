/** Sin "use client": lo usan las páginas (servidor) y los formularios (cliente). */
export interface CampaignOption {
  id: string;
  /** Ej. "Soja 26/27 · Potrero Norte". */
  label: string;
}

export function toCampaignOptions(
  campaigns: { id: string; crop: string; season: string; pasture: { name: string } }[],
): CampaignOption[] {
  return campaigns.map((c) => ({ id: c.id, label: `${c.crop} ${c.season} · ${c.pasture.name}` }));
}
