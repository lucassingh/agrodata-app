"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@repo/core/tenants/tenant-labels";
import type { CreateTenantInput } from "@repo/core/tenants/tenants.schema";
import { createTenantAction } from "@/app/dashboard/(app)/_lib/tenant-actions";

interface CreateTenantDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (tenantId: string) => void;
}

const DEFAULT_VALUES: CreateTenantInput = {
  name: "",
  timezone: "America/Argentina/Buenos_Aires",
  baseCurrency: "ARS",
  category: "MIXTO",
};

export function CreateTenantDialog({ open, onClose, onCreated }: CreateTenantDialogProps) {
  const router = useRouter();
  const [values, setValues] = useState<CreateTenantInput>(DEFAULT_VALUES);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.name.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createTenantAction(values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setValues(DEFAULT_VALUES);
      onClose();
      onCreated?.(result.tenant.id);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        if (!next && !isPending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo campo</DialogTitle>
            <DialogDescription>
              Creá un establecimiento para empezar a cargar información.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Nombre del campo</Label>
              <Input
                id="tenant-name"
                autoFocus
                required
                placeholder="Ej. Estancia Los Alamos"
                value={values.name}
                onChange={(e) => setValues((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Rubro</Label>
              <Select
                value={values.category}
                onValueChange={(v: string | null) =>
                  v &&
                  setValues((p) => ({ ...p, category: v as CreateTenantInput["category"] }))
                }
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

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creando..." : "Crear campo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
