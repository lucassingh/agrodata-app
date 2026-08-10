"use client";

import { useMemo, useState, useTransition } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Combobox, type ComboboxOption } from "@/components/combobox";
import { updatePastureAction, createCropOptionAction } from "./actions";
import type { Pasture } from "./types";

export function QuickAddCropDialog({
  pasture,
  cropOptions,
  onClose,
}: {
  pasture: Pasture;
  cropOptions: ComboboxOption[];
  onClose: () => void;
}) {
  const [crop, setCrop] = useState("");
  const [hectares, setHectares] = useState("");
  const [isPending, startTransition] = useTransition();

  const existingSum = useMemo(
    () => pasture.crops.reduce((sum, c) => sum + (c.hectares ?? 0), 0),
    [pasture.crops],
  );
  const newValue = Number(hectares) || 0;
  const projectedSum = existingSum + newValue;
  const overflow = Boolean(pasture.hectares) && projectedSum > (pasture.hectares ?? 0);

  const handleSave = () => {
    if (!crop || overflow) return;
    startTransition(async () => {
      const nextCrops = [
        ...pasture.crops.map((c) => ({
          crop: c.crop,
          hectares: c.hectares ?? undefined,
          startDate: c.startDate?.toISOString(),
        })),
        { crop, hectares: hectares ? newValue : undefined },
      ];
      const result = await updatePastureAction(pasture.id, { crops: nextCrops });
      if (!result.success) {
        toast.error(result.error ?? "No se pudo agregar el cultivo");
        return;
      }
      toast.success(`Cultivo agregado a ${pasture.name}`);
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Agregar cultivo a {pasture.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {pasture.hectares ? (
            <div className="space-y-1">
              <Progress value={Math.min(100, (projectedSum / pasture.hectares) * 100)} />
              <p className="text-xs text-muted-foreground">
                {projectedSum} / {pasture.hectares} ha asignadas
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Cultivo</Label>
            <Combobox
              options={cropOptions}
              value={crop}
              onChange={setCrop}
              onCreateNew={async (label) => {
                const result = await createCropOptionAction(label);
                if (!result.success) throw new Error(result.error);
                return { value: result.data.name, label: result.data.name };
              }}
              placeholder="Elegí o creá un cultivo"
            />
          </div>

          <div className="space-y-2">
            <Label>Hectáreas (opcional)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={hectares}
              onChange={(e) => setHectares(e.target.value)}
              aria-invalid={overflow}
            />
            {overflow ? (
              <p className="text-xs text-destructive">Supera la superficie del potrero</p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={isPending || !crop || overflow} onClick={handleSave}>
            {isPending ? "Agregando..." : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
