"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  FARM_ACTIVITIES,
  FARM_ACTIVITY_HINT,
  FARM_ACTIVITY_LABEL,
  type FarmActivity,
} from "@repo/core/tenants/tenant-labels";

/** Actividades del campo, en cualquier combinación. Definen los módulos que se ven. */
export function ActivityPicker({
  value,
  onChange,
  disabled,
  stacked = false,
}: {
  value: FarmActivity[];
  onChange: (next: FarmActivity[]) => void;
  disabled?: boolean;
  /** Una debajo de otra (espacios angostos, como un diálogo). */
  stacked?: boolean;
}) {
  const toggle = (activity: FarmActivity, checked: boolean) =>
    onChange(checked ? FARM_ACTIVITIES.filter((a) => a === activity || value.includes(a)) : value.filter((a) => a !== activity));

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium">¿Qué se hace en este campo?</legend>
      <div className={stacked ? "grid gap-2" : "grid gap-2 sm:grid-cols-3"}>
        {FARM_ACTIVITIES.map((activity) => (
          <label
            key={activity}
            className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
          >
            <Checkbox
              checked={value.includes(activity)}
              disabled={disabled}
              onCheckedChange={(checked: boolean) => toggle(activity, checked)}
            />
            <span>
              <span className="block text-sm font-medium">{FARM_ACTIVITY_LABEL[activity]}</span>
              <span className="block text-xs text-muted-foreground">{FARM_ACTIVITY_HINT[activity]}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Podés elegir una o varias. Se cambia cuando quieras en Preferencias.</p>
    </fieldset>
  );
}
