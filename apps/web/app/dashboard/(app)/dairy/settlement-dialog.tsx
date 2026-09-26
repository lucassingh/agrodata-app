"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMilkSettlementAction } from "./actions";

const optional = (value: string) => (value.trim() === "" ? undefined : Number(value));

function monthStart(): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  return `${today.slice(0, 7)}-01`;
}

export function SettlementDialog({ onClose }: { onClose: () => void }) {
  const [periodStart, setPeriodStart] = useState(monthStart());
  const [periodEnd, setPeriodEnd] = useState(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date()),
  );
  const [dairy, setDairy] = useState("");
  const [liters, setLiters] = useState("");
  const [total, setTotal] = useState("");
  const [fat, setFat] = useState("");
  const [protein, setProtein] = useState("");
  const [isPending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await createMilkSettlementAction({
        periodStart,
        periodEnd,
        dairy: dairy.trim() || undefined,
        liters: Number(liters),
        totalAmount: Number(total),
        fatPct: optional(fat),
        proteinPct: optional(protein),
        currency: "ARS",
      });
      if (!result.success) return void toast.error(result.error);
      toast.success("Liquidación guardada");
      onClose();
    });

  const field = (id: string, label: string, value: string, set: (v: string) => void, type = "number") => (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} type={type} min={type === "number" ? 0 : undefined} step="any" value={value} onChange={(e) => set(e.target.value)} />
    </div>
  );

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cargar liquidación de leche</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {field("settlement-from", "Desde", periodStart, setPeriodStart, "date")}
          {field("settlement-to", "Hasta", periodEnd, setPeriodEnd, "date")}
          <div className="col-span-2">{field("settlement-dairy", "Usina", dairy, setDairy, "text")}</div>
          {field("settlement-liters", "Litros liquidados", liters, setLiters)}
          {field("settlement-total", "Total a cobrar ($)", total, setTotal)}
          {field("settlement-fat", "Grasa (%)", fat, setFat)}
          {field("settlement-protein", "Proteína (%)", protein, setProtein)}
        </div>
        <p className="text-xs text-muted-foreground">El precio por litro sale de total ÷ litros. Usá el importe sin IVA.</p>
        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={isPending} onClick={save}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
