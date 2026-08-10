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
  TENANT_CATEGORY_LABELS,
  TENANT_TIMEZONES,
  BASE_CURRENCIES,
  tenantCategoryLabel,
} from "@repo/core/tenants/tenant-labels";
import { updateTenantConfigAction } from "./actions";
import { setActiveTenantAction } from "@/app/dashboard/(app)/_lib/tenant-actions";

interface TenantMembership {
  tenantId: string;
  role: "ADMIN" | "USER_GENERAL";
  tenant: {
    id: string;
    name: string;
    category: string;
    timezone: string;
    baseCurrency: string;
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
  location: string;
  totalHa: string;
}

function toFormValues(tenant: TenantMembership["tenant"]): TenantFormValues {
  return {
    name: tenant.name,
    category: tenant.category,
    timezone: tenant.timezone,
    baseCurrency: tenant.baseCurrency,
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
    startTransition(async () => {
      const result = await updateTenantConfigAction(tenant.id, {
        name: values.name.trim(),
        category: values.category,
        timezone: values.timezone,
        baseCurrency: values.baseCurrency,
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
        <div className="space-y-2">
          <Label>Rubro</Label>
          <Select
            value={values.category}
            disabled={readOnly}
            onValueChange={(v: string | null) => v && setValues((p) => ({ ...p, category: v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TENANT_CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Zona horaria</Label>
          <Select
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
                    Rubro: {tenantCategoryLabel(m.tenant.category)} · ID: {m.tenant.id}
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
