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
import { createExpenseCategoryAction } from "./actions";

interface ExpenseCategoryDialogProps {
  onClose: () => void;
  onCreated: (category: { id: string; name: string; color: string }) => void;
}

const DEFAULT_COLOR = "#2D6A4F";

export function ExpenseCategoryDialog({ onClose, onCreated }: ExpenseCategoryDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!name.trim()) {
      setError("Ingresá el nombre de la categoría");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createExpenseCategoryAction(name.trim(), color);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo crear la categoría");
        return;
      }
      toast.success("Categoría creada");
      onCreated(result.data);
    });
  };

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Nueva categoría de gasto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-20 cursor-pointer rounded-md border border-input bg-transparent p-1"
              />
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${color}26`, color }}
              >
                {color}
              </span>
            </div>
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
