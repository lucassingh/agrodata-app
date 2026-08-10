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
import { Combobox, type ComboboxOption } from "@/components/combobox";
import { updatePastureAction, createAnimalOptionAction } from "./actions";
import type { Pasture } from "./types";

export function QuickAddAnimalDialog({
  pasture,
  animalOptions,
  onClose,
}: {
  pasture: Pasture;
  animalOptions: ComboboxOption[];
  onClose: () => void;
}) {
  const [animalType, setAnimalType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [averageWeight, setAverageWeight] = useState("");
  const [isPending, startTransition] = useTransition();

  const qty = Number(quantity) || 0;
  const canSave = Boolean(animalType) && qty > 0;

  const handleSave = () => {
    if (!canSave) return;
    startTransition(async () => {
      const nextAnimals = [
        ...pasture.animals.map((a) => ({
          quantity: a.quantity,
          animalType: a.animalType,
          averageWeight: a.averageWeight ?? undefined,
        })),
        {
          quantity: qty,
          animalType,
          averageWeight: averageWeight ? Number(averageWeight) : undefined,
        },
      ];
      const result = await updatePastureAction(pasture.id, { animals: nextAnimals });
      if (!result.success) {
        toast.error(result.error ?? "No se pudieron agregar los animales");
        return;
      }
      toast.success(`Animales agregados a ${pasture.name}`);
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Agregar animales a {pasture.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de animal</Label>
            <Combobox
              options={animalOptions}
              value={animalType}
              onChange={setAnimalType}
              onCreateNew={async (label) => {
                const result = await createAnimalOptionAction(label);
                if (!result.success) throw new Error(result.error);
                return { value: result.data.name, label: result.data.name };
              }}
              placeholder="Elegí o creá una categoría"
            />
          </div>

          <div className="space-y-2">
            <Label>Cantidad</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Peso promedio en kg (opcional)</Label>
            <Input
              type="number"
              min={0}
              value={averageWeight}
              onChange={(e) => setAverageWeight(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={isPending || !canSave} onClick={handleSave}>
            {isPending ? "Agregando..." : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
