"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TENANT_TIMEZONES,
  BASE_CURRENCIES,
} from "@repo/core/tenants/tenant-labels";
import { updateTenantConfigAction } from "./actions";
import { setActiveTenantAction } from "@/app/dashboard/(app)/_lib/tenant-actions";
import { EXCHANGE_RATE_KINDS, EXCHANGE_RATE_LABEL, type ExchangeRateKind } from "@repo/core/economy/exchange-rates";
import { VAT_CONDITION_LABEL, type VatCondition } from "@repo/core/economy/vat";
import { ActivityPicker } from "@/components/activity-picker";
import { activitiesLabel, type FarmActivity } from "@repo/core/tenants/tenant-labels";

const VAT_CONDITION_ITEMS = (Object.keys(VAT_CONDITION_LABEL) as VatCondition[]).map((value) => ({
  value,
  label: VAT_CONDITION_LABEL[value],
}));

const EXCHANGE_RATE_ITEMS = EXCHANGE_RATE_KINDS.map((kind) => ({
  value: kind,
  label: kind === "MAYORISTA" ? `${EXCHANGE_RATE_LABEL[kind]} (oficial del BCRA, Com. A 3500)` : EXCHANGE_RATE_LABEL[kind],
}));

interface TenantMembership {
  tenantId: string;
  role: "ADMIN" | "USER_GENERAL";
  tenant: {
    id: string;
    name: string;
    category: string;
    timezone: string;
    baseCurrency: string;
    exchangeRateKind: ExchangeRateKind;
    vatCondition: VatCondition;
    activities: FarmActivity[];
    location: string | null;
    totalHa: number | null;
  };
}

interface CampoTabProps {
  memberships: TenantMembership[];
  activeTenantId: string | null;
  isOwner: boolean;
}

interface TenantFormValues {
  name: string;
  category: string;
  timezone: string;
  baseCurrency: string;
  exchangeRateKind: ExchangeRateKind;
  vatCondition: VatCondition;
  activities: FarmActivity[];
  location: string;
  totalHa: string;
}

function toFormValues(tenant: TenantMembership["tenant"]): TenantFormValues {
  return {
    name: tenant.name,
    category: tenant.category,
    timezone: tenant.timezone,
    baseCurrency: tenant.baseCurrency,
    exchangeRateKind: tenant.exchangeRateKind,
    vatCondition: tenant.vatCondition,
    activities: tenant.activities,
    location: tenant.location ?? "",
    totalHa: tenant.totalHa?.toString() ?? "",
  };
}

function TenantConfigForm({
  tenant,
  readOnly,
}: {
  tenant: TenantMembership["tenant"];
  readOnly: boolean;
}) {
  const [values, setValues] = useState<TenantFormValues>(() => toFormValues(tenant));
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.name.trim()) return;
    if (values.activities.length === 0) {
      toast.error("Elegí al menos una actividad del campo.");
      return;
    }
    startTransition(async () => {
      const result = await updateTenantConfigAction(tenant.id, {
        name: values.name.trim(),
        category: values.category,
        timezone: values.timezone,
        baseCurrency: values.baseCurrency,
        exchangeRateKind: values.exchangeRateKind,
        vatCondition: values.vatCondition,
        activities: values.activities,
        location: values.location.trim() || undefined,
        totalHa: values.totalHa ? Number(values.totalHa) : undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Campo actualizado.");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t border-border pt-4">
      {readOnly ? (
        <p className="text-sm text-muted-foreground">
          Solo el Owner puede modificar estos datos. Como Farm Manager o usuario
          invitado los ves en solo lectura.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Nombre</Label>
          <Input
            value={values.name}
            disabled={readOnly}
            onChange={(e) => setValues((p) => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div className="sm:col-span-2">
          <ActivityPicker
            value={values.activities}
            disabled={readOnly}
            onChange={(activities) => setValues((p) => ({ ...p, activities }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Zona horaria</Label>
          <Select
            items={TENANT_TIMEZONES}
            value={values.timezone}
            disabled={readOnly}
            onValueChange={(v: string | null) => v && setValues((p) => ({ ...p, timezone: v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TENANT_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Moneda base</Label>
          <Select
            items={BASE_CURRENCIES}
            value={values.baseCurrency}
            disabled={readOnly}
            onValueChange={(v: string | null) =>
              v && setValues((p) => ({ ...p, baseCurrency: v }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BASE_CURRENCIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="exchange-rate-kind">Dólar para los márgenes</Label>
          <Select
            items={EXCHANGE_RATE_ITEMS}
            value={values.exchangeRateKind}
            disabled={readOnly}
            onValueChange={(v: string | null) =>
              v && setValues((p) => ({ ...p, exchangeRateKind: v as ExchangeRateKind }))
            }
          >
            <SelectTrigger id="exchange-rate-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXCHANGE_RATE_ITEMS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Con este dólar se pasan a dólares los costos e ingresos de cada lote. Se actualiza solo.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="vat-condition">Condición frente al IVA</Label>
          <Select
            items={VAT_CONDITION_ITEMS}
            value={values.vatCondition}
            disabled={readOnly}
            onValueChange={(v: string | null) => v && setValues((p) => ({ ...p, vatCondition: v as VatCondition }))}
          >
            <SelectTrigger id="vat-condition" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VAT_CONDITION_ITEMS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Responsable inscripto: los márgenes cuentan los costos sin IVA (lo recuperás). Monotributista: con IVA.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Ubicación</Label>
          <Input
            value={values.location}
            disabled={readOnly}
            placeholder="Ej. Partido de General López"
            onChange={(e) => setValues((p) => ({ ...p, location: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Superficie total (ha)</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={values.totalHa}
            disabled={readOnly}
            onChange={(e) => setValues((p) => ({ ...p, totalHa: e.target.value }))}
          />
        </div>
      </div>

      {!readOnly ? (
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      ) : null}
    </form>
  );
}

export function CampoTab({ memberships, activeTenantId, isOwner }: CampoTabProps) {
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const canSwitchActiveTenant = isOwner && memberships.length > 1;

  const handleSetActive = (tenantId: string) => {
    setSwitchingId(tenantId);
    void setActiveTenantAction(tenantId)
      .then((result) => {
        if (!result.success) toast.error(result.error);
      })
      .finally(() => setSwitchingId(null));
  };

  if (memberships.length === 0) {
    return (
      <p className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
        No tenés establecimientos asociados. Creá uno desde el menú de usuario
        (arriba a la derecha) con Agregar campo.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {memberships.map((m) => {
        const isActive = m.tenantId === activeTenantId;
        return (
          <div
            key={m.tenantId}
            className="rounded-xl border border-border bg-card p-4 shadow-soft"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Building2 size={18} />
                </div>
                <div>
                  <p className="font-heading text-base font-semibold">{m.tenant.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {activitiesLabel(m.tenant.activities)} · ID: {m.tenant.id}
                  </p>
                  {m.tenant.location ? (
                    <p className="text-xs text-muted-foreground">{m.tenant.location}</p>
                  ) : null}
                </div>
              </div>
              <Badge variant={m.role === "ADMIN" ? "secondary" : "outline"}>
                {m.role === "ADMIN" ? "Admin" : "Usuario"}
              </Badge>
            </div>

            {canSwitchActiveTenant ? (
              <label className="mt-3 flex items-center gap-2 text-sm">
                <Checkbox
                  checked={isActive}
                  disabled={switchingId === m.tenantId}
                  onCheckedChange={() => !isActive && handleSetActive(m.tenantId)}
                />
                Campo activo
              </label>
            ) : isActive ? (
              <Badge variant="outline" className="mt-3">
                Campo activo
              </Badge>
            ) : null}

            {isActive ? (
              <TenantConfigForm tenant={m.tenant} readOnly={!isOwner} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
