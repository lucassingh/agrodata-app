"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Sprout, Trash2 } from "lucide-react";
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
import { FormSectionHeader } from "@/components/form-section-header";
import { CowHeadIcon } from "@/components/cow-head-icon";
import { Combobox, type ComboboxOption } from "@/components/combobox";
import { createPastureAction, updatePastureAction, createCropOptionAction, createAnimalOptionAction } from "./actions";
import type { Pasture } from "./types";

const MAX_SUB_ENTITIES = 5;

interface CropRow {
  key: string;
  crop: string;
  hectares: string;
  startDate: string;
}

interface AnimalRow {
  key: string;
  quantity: string;
  animalType: string;
  averageWeight: string;
}

let rowKeySeq = 0;
function nextKey() {
  rowKeySeq += 1;
  return `row-${rowKeySeq}`;
}

function cropsFromPasture(pasture?: Pasture): CropRow[] {
  return (pasture?.crops ?? []).map((c) => ({
    key: nextKey(),
    crop: c.crop,
    hectares: c.hectares?.toString() ?? "",
    startDate: c.startDate ? new Date(c.startDate).toISOString().slice(0, 10) : "",
  }));
}

function animalsFromPasture(pasture?: Pasture): AnimalRow[] {
  return (pasture?.animals ?? []).map((a) => ({
    key: nextKey(),
    quantity: a.quantity.toString(),
    animalType: a.animalType,
    averageWeight: a.averageWeight?.toString() ?? "",
  }));
}

interface PastureFormDialogProps {
  mode: "create" | "edit";
  pasture?: Pasture;
  cropOptions: ComboboxOption[];
  animalOptions: ComboboxOption[];
  onClose: () => void;
}

export function PastureFormDialog({
  mode,
  pasture,
  cropOptions,
  animalOptions,
  onClose,
}: PastureFormDialogProps) {
  const [name, setName] = useState(pasture?.name ?? "");
  const [hectares, setHectares] = useState(pasture?.hectares?.toString() ?? "");
  const [crops, setCrops] = useState<CropRow[]>(() => cropsFromPasture(pasture));
  const [animals, setAnimals] = useState<AnimalRow[]>(() => animalsFromPasture(pasture));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pastureHa = Number(hectares) || 0;
  const cropsSum = useMemo(
    () => crops.reduce((sum, c) => sum + (Number(c.hectares) || 0), 0),
    [crops],
  );
  const overflow = pastureHa > 0 && cropsSum > pastureHa;

  const addCropRow = () => {
    if (crops.length >= MAX_SUB_ENTITIES) return;
    setCrops((prev) => [...prev, { key: nextKey(), crop: "", hectares: "", startDate: "" }]);
  };
  const addAnimalRow = () => {
    if (animals.length >= MAX_SUB_ENTITIES) return;
    setAnimals((prev) => [
      ...prev,
      { key: nextKey(), quantity: "", animalType: "", averageWeight: "" },
    ]);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError("Ingresá el nombre del potrero");
      return;
    }
    if (overflow) {
      setError(
        `La superficie de cultivos (${cropsSum} ha) supera la del potrero (${pastureHa} ha).`,
      );
      return;
    }
    setError(null);

    const payload = {
      name: name.trim(),
      hectares: hectares ? Number(hectares) : undefined,
      crops: crops
        .filter((c) => c.crop.trim())
        .map((c) => ({
          crop: c.crop.trim(),
          hectares: c.hectares ? Number(c.hectares) : undefined,
          startDate: c.startDate || undefined,
        })),
      animals: animals
        .filter((a) => Number(a.quantity) > 0 && a.animalType)
        .map((a) => ({
          quantity: Number(a.quantity),
          animalType: a.animalType,
          averageWeight: a.averageWeight ? Number(a.averageWeight) : undefined,
        })),
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createPastureAction(payload)
          : await updatePastureAction(pasture!.id, payload);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo guardar el potrero");
        return;
      }
      toast.success(mode === "create" ? "Potrero creado" : "Potrero actualizado");
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nuevo potrero" : "Editar potrero"}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nombre del potrero</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Potrero Norte"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Hectáreas</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={hectares}
                onChange={(e) => setHectares(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <FormSectionHeader
              icon={<Sprout size={14} />}
              title="Cultivos"
              color="#2D6A4F"
              count={crops.length}
              maxCount={MAX_SUB_ENTITIES}
              actionLabel="Agregar"
              actionDisabled={crops.length >= MAX_SUB_ENTITIES}
              onAction={addCropRow}
            />
            {crops.map((row, index) => (
              <div key={row.key} className="grid grid-cols-[1fr_100px_140px_auto] items-end gap-2">
                <div className="space-y-1">
                  {index === 0 ? <Label className="text-xs">Cultivo</Label> : null}
                  <Combobox
                    options={cropOptions}
                    value={row.crop}
                    onChange={(v) =>
                      setCrops((prev) =>
                        prev.map((r) => (r.key === row.key ? { ...r, crop: v } : r)),
                      )
                    }
                    onCreateNew={async (label) => {
                      const result = await createCropOptionAction(label);
                      if (!result.success) throw new Error(result.error);
                      return { value: result.data.name, label: result.data.name };
                    }}
                    placeholder="Cultivo"
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 ? <Label className="text-xs">Hectáreas</Label> : null}
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={row.hectares}
                    onChange={(e) =>
                      setCrops((prev) =>
                        prev.map((r) =>
                          r.key === row.key ? { ...r, hectares: e.target.value } : r,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 ? <Label className="text-xs">Inicio</Label> : null}
                  <Input
                    type="date"
                    value={row.startDate}
                    onChange={(e) =>
                      setCrops((prev) =>
                        prev.map((r) =>
                          r.key === row.key ? { ...r, startDate: e.target.value } : r,
                        ),
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setCrops((prev) => prev.filter((r) => r.key !== row.key))}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
            {pastureHa > 0 ? (
              <div className="space-y-1">
                <Progress value={Math.min(100, (cropsSum / pastureHa) * 100)} />
                <p className={`text-xs ${overflow ? "text-destructive" : "text-muted-foreground"}`}>
                  {cropsSum} / {pastureHa} ha asignadas
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <FormSectionHeader
              icon={<CowHeadIcon size={14} />}
              title="Animales"
              color="#7C6445"
              count={animals.length}
              maxCount={MAX_SUB_ENTITIES}
              actionLabel="Agregar"
              actionDisabled={animals.length >= MAX_SUB_ENTITIES}
              onAction={addAnimalRow}
            />
            {animals.map((row, index) => (
              <div key={row.key} className="grid grid-cols-[100px_1fr_140px_auto] items-end gap-2">
                <div className="space-y-1">
                  {index === 0 ? <Label className="text-xs">Cantidad</Label> : null}
                  <Input
                    type="number"
                    min={0}
                    value={row.quantity}
                    onChange={(e) =>
                      setAnimals((prev) =>
                        prev.map((r) =>
                          r.key === row.key ? { ...r, quantity: e.target.value } : r,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 ? <Label className="text-xs">Categoría animal</Label> : null}
                  <Combobox
                    options={animalOptions}
                    value={row.animalType}
                    onChange={(v) =>
                      setAnimals((prev) =>
                        prev.map((r) => (r.key === row.key ? { ...r, animalType: v } : r)),
                      )
                    }
                    onCreateNew={async (label) => {
                      const result = await createAnimalOptionAction(label);
                      if (!result.success) throw new Error(result.error);
                      return { value: result.data.name, label: result.data.name };
                    }}
                    placeholder="Categoría"
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 ? <Label className="text-xs">Peso prom. kg</Label> : null}
                  <Input
                    type="number"
                    min={0}
                    value={row.averageWeight}
                    onChange={(e) =>
                      setAnimals((prev) =>
                        prev.map((r) =>
                          r.key === row.key ? { ...r, averageWeight: e.target.value } : r,
                        ),
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setAnimals((prev) => prev.filter((r) => r.key !== row.key))}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={isPending || overflow} onClick={handleSave}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
