"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ALERT_KINDS,
  ALERT_KIND_HINT,
  ALERT_KIND_LABEL,
  DEFAULT_ALERT_SETTINGS,
  type AlertKind,
  type AlertSettings,
} from "@repo/core/alerts/alert-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { saveAlertSettingsAction, setWhatsappAlertsAction } from "./actions";

export interface AlertsTabProps {
  settings: AlertSettings;
  /** Dueño o encargado: cambian los avisos del campo. */
  canConfigure: boolean;
  whatsappAlerts: boolean;
  hasWhatsapp: boolean;
}

type NumberKey = Exclude<keyof AlertSettings, "enabled">;

/** El valor que acompaña a cada aviso, con su frase («Avisar cuando alcance para menos de 14 días»). */
const THRESHOLD: Partial<Record<AlertKind, { key: NumberKey; before: string; after: string; step: string }>> = {
  STOCK: { key: "stockCoverageDays", before: "Avisar cuando alcance para menos de", after: "días", step: "1" },
  SANITARY: { key: "sanitaryLeadDays", before: "Avisar", after: "días antes del vencimiento", step: "1" },
  ADPV: { key: "adpvDropPct", before: "Avisar si el aumento diario cae", after: "% o más", step: "1" },
  MILK: { key: "milkDropPct", before: "Avisar si los litros por vaca caen", after: "% o más", step: "1" },
  EXPENSES: { key: "expenseFactor", before: "Avisar cuando gaste más de", after: "veces su promedio", step: "0.1" },
};

export function AlertsTab({ settings, canConfigure, whatsappAlerts, hasWhatsapp }: AlertsTabProps) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [values, setValues] = useState<Record<NumberKey, string>>({
    stockCoverageDays: String(settings.stockCoverageDays),
    sanitaryLeadDays: String(settings.sanitaryLeadDays),
    adpvDropPct: String(settings.adpvDropPct),
    milkDropPct: String(settings.milkDropPct),
    expenseFactor: String(settings.expenseFactor),
  });
  const [receive, setReceive] = useState(whatsappAlerts);
  const [saving, startSave] = useTransition();
  const [toggling, startToggle] = useTransition();

  const save = () => {
    startSave(async () => {
      const result = await saveAlertSettingsAction({
        enabled,
        stockCoverageDays: Number(values.stockCoverageDays),
        sanitaryLeadDays: Number(values.sanitaryLeadDays),
        adpvDropPct: Number(values.adpvDropPct),
        milkDropPct: Number(values.milkDropPct),
        expenseFactor: Number(values.expenseFactor),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Avisos guardados.");
    });
  };

  const resetDefaults = () => {
    setEnabled(DEFAULT_ALERT_SETTINGS.enabled);
    setValues({
      stockCoverageDays: String(DEFAULT_ALERT_SETTINGS.stockCoverageDays),
      sanitaryLeadDays: String(DEFAULT_ALERT_SETTINGS.sanitaryLeadDays),
      adpvDropPct: String(DEFAULT_ALERT_SETTINGS.adpvDropPct),
      milkDropPct: String(DEFAULT_ALERT_SETTINGS.milkDropPct),
      expenseFactor: String(DEFAULT_ALERT_SETTINGS.expenseFactor),
    });
  };

  const toggleWhatsapp = (next: boolean) => {
    setReceive(next);
    startToggle(async () => {
      const result = await setWhatsappAlertsAction(next);
      if (!result.success) {
        setReceive(!next);
        toast.error(result.error);
        return;
      }
      toast.success(next ? "Vas a recibir los avisos por WhatsApp." : "No vas a recibir los avisos por WhatsApp.");
    });
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-soft">
        <CardContent className="space-y-4">
          <div>
            <h2 className="font-heading text-base font-semibold">Avisos del campo</h2>
            <p className="text-sm text-muted-foreground">
              Aparecen en el Resumen y llegan por WhatsApp una vez por día (lunes a sábado, 8 hs), solo cuando hay
              avisos nuevos. Los que siguen abiertos se recuerdan cada 7 días.
            </p>
            {!canConfigure ? (
              <p className="mt-2 text-sm text-muted-foreground">Los configuran el dueño y el encargado del campo.</p>
            ) : null}
          </div>

          <ul className="divide-y divide-border">
            {ALERT_KINDS.map((kind) => {
              const threshold = THRESHOLD[kind];
              const inputId = `alert-${kind}-value`;
              return (
                <li key={kind} className="space-y-2 py-3 first:pt-0 last:pb-0">
                  <label className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={enabled[kind]}
                      disabled={!canConfigure}
                      onCheckedChange={(checked: boolean) => setEnabled((prev) => ({ ...prev, [kind]: checked }))}
                    />
                    <span>
                      <span className="block text-sm font-medium">{ALERT_KIND_LABEL[kind]}</span>
                      <span className="block text-xs text-muted-foreground">{ALERT_KIND_HINT[kind]}</span>
                    </span>
                  </label>
                  {threshold && enabled[kind] ? (
                    <div className="ml-7 flex flex-wrap items-center gap-2 text-sm">
                      <label htmlFor={inputId}>{threshold.before}</label>
                      <Input
                        id={inputId}
                        type="number"
                        inputMode="decimal"
                        step={threshold.step}
                        min={0}
                        className="h-8 w-20"
                        disabled={!canConfigure}
                        value={values[threshold.key]}
                        onChange={(e) => setValues((prev) => ({ ...prev, [threshold.key]: e.target.value }))}
                      />
                      <span>{threshold.after}</span>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {canConfigure ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" disabled={saving} onClick={resetDefaults}>
                Volver a los valores recomendados
              </Button>
              <Button disabled={saving} onClick={save}>
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-soft">
        <CardContent className="space-y-2">
          <h2 className="font-heading text-base font-semibold">Tus avisos por WhatsApp</h2>
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox checked={receive} disabled={toggling || !hasWhatsapp} onCheckedChange={(checked: boolean) => toggleWhatsapp(checked)} />
            <span className="text-sm">Recibir los avisos de este campo por WhatsApp</span>
          </label>
          <p className="text-xs text-muted-foreground">
            {hasWhatsapp
              ? "Solo cambia para vos: el resto del equipo decide por su cuenta."
              : "Tu cuenta no tiene un número de WhatsApp cargado, así que los avisos se ven solo en el Resumen."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
