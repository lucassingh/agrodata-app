"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { CampaignOption } from "@/lib/campaign-options";

export type { CampaignOption };

/** Elegir a qué campañas va un costo directo. Varias: se reparte por hectáreas. */
export function CampaignPicker({
  options,
  value,
  onChange,
}: {
  options: CampaignOption[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  if (options.length === 0) return null;
  const toggle = (id: string, checked: boolean) =>
    onChange(checked ? [...value, id] : value.filter((selected) => selected !== id));

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Costo directo de (opcional)</legend>
      <div className="max-h-36 space-y-1.5 overflow-auto rounded-lg border border-border p-2">
        {options.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.includes(option.id)}
              onCheckedChange={(checked: boolean) => toggle(option.id, checked)}
            />
            {option.label}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Suma al margen de esa campaña. Si elegís varias, se reparte por hectáreas.
      </p>
    </fieldset>
  );
}

