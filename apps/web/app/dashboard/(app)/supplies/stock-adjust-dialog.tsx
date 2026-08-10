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
import { adjustSupplyStockAction } from "./actions";
import type { Supply } from "./types";

interface StockAdjustDialogProps {
  supply: Supply;
  direction: "in" | "out";
  onClose: () => void;
}

export function StockAdjustDialog({ supply, direction, onClose }: StockAdjustDialogProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleApply = () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Ingresá una cantidad mayor a 0");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await adjustSupplyStockAction(supply.id, direction, n);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo actualizar el stock");
        return;
      }
      toast.success(direction === "in" ? "Stock actualizado (ingreso)" : "Stock actualizado (consumo)");
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{direction === "in" ? "Registrar ingreso" : "Registrar consumo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {supply.name} — stock actual: <span className="font-semibold text-foreground">{supply.quantity}</span>{" "}
            {supply.unit ?? ""}
          </p>

          <div className="space-y-2">
            <Label>Cantidad</Label>
            <Input
              type="number"
              min={0.01}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={isPending} onClick={handleApply}>
            {isPending ? "Aplicando..." : "Aplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
