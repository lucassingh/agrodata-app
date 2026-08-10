"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
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
import { createSupplyAction, updateSupplyAction } from "./actions";
import type { Supply, SupplyCategoryRef } from "./types";

interface CreatedSupplyInfo {
  id: string;
  name: string;
  categoryName: string;
  quantity: number;
  unit?: string;
}

interface SupplyFormDialogProps {
  mode: "create" | "edit";
  supply?: Supply;
  categories: SupplyCategoryRef[];
  onClose: () => void;
  onCreated: (info: CreatedSupplyInfo) => void;
}

export function SupplyFormDialog({
  mode,
  supply,
  categories,
  onClose,
  onCreated,
}: SupplyFormDialogProps) {
  const [categoryId, setCategoryId] = useState(supply?.categoryId ?? categories[0]?.id ?? "");
  const [name, setName] = useState(supply?.name ?? "");
  const [quantity, setQuantity] = useState(supply?.quantity.toString() ?? "");
  const [unit, setUnit] = useState(supply?.unit ?? "");
  const [cost, setCost] = useState(supply?.cost?.toString() ?? "");
  const [currency, setCurrency] = useState<"ARS" | "USD">(supply?.currency ?? "ARS");
  const [supplier, setSupplier] = useState(supply?.supplier ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!name.trim()) {
      setError("Ingresá el nombre del insumo");
      return;
    }
    if (!quantity || Number(quantity) < 0) {
      setError("Ingresá una cantidad válida");
      return;
    }
    if (!categoryId) {
      setError("Elegí una categoría");
      return;
    }
    setError(null);

    const payload = {
      categoryId,
      name: name.trim(),
      quantity: Number(quantity),
      unit: unit.trim() || undefined,
      cost: cost ? Number(cost) : undefined,
      currency,
      supplier: supplier.trim() || undefined,
    };

    startTransition(async () => {
      if (mode === "create") {
        const result = await createSupplyAction(payload);
        if (!result.success) {
          toast.error(result.error ?? "No se pudo guardar el insumo");
          return;
        }
        onCreated({
          id: result.data.id,
          name: payload.name,
          categoryName: categories.find((c) => c.id === categoryId)?.name ?? "",
          quantity: payload.quantity,
          unit: payload.unit,
        });
        return;
      }

      const result = await updateSupplyAction(supply!.id, payload);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo guardar el insumo");
        return;
      }
      toast.success("Insumo actualizado");
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nuevo insumo" : "Editar insumo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select
              items={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={categoryId}
              onValueChange={(v: string | null) => v && setCategoryId(v)}
              disabled={mode === "edit"}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="kgs, lts…"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Costo</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select
                value={currency}
                onValueChange={(v: string | null) => v && setCurrency(v as "ARS" | "USD")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Proveedor</Label>
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={isPending} onClick={handleSave}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
