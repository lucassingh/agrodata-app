"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCampaignAction } from "./actions";

function todayInArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

const optionalNumber = (value: string) => (value.trim() === "" ? undefined : Number(value));

export function CampaignFormDialog({
  pastures,
  onClose,
}: {
  pastures: { id: string; name: string; hectares: number | null }[];
  onClose: () => void;
}) {
  const [pastureId, setPastureId] = useState(pastures[0]?.id ?? "");
  const [crop, setCrop] = useState("");
  const [hectares, setHectares] = useState(pastures[0]?.hectares ? String(pastures[0].hectares) : "");
  const [sowingDate, setSowingDate] = useState(todayInArgentina());
  const [referencePrice, setReferencePrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const choosePasture = (id: string) => {
    setPastureId(id);
    const hectaresOfPasture = pastures.find((p) => p.id === id)?.hectares;
    if (hectaresOfPasture) setHectares(String(hectaresOfPasture));
  };

  const save = () => {
    if (!crop.trim()) {
      setError("Ingresá el cultivo.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createCampaignAction({
        pastureId,
        crop: crop.trim(),
        hectares: optionalNumber(hectares),
        sowingDate,
        referencePrice: optionalNumber(referencePrice),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Campaña creada");
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva campaña</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-pasture">Lote</Label>
            <Select
              items={pastures.map((p) => ({ value: p.id, label: p.name }))}
              value={pastureId}
              onValueChange={(v: string | null) => v && choosePasture(v)}
            >
              <SelectTrigger id="campaign-pasture" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pastures.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="campaign-crop">Cultivo</Label>
              <Input id="campaign-crop" value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="Soja" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-hectares">Hectáreas</Label>
              <Input id="campaign-hectares" type="number" min={0} step={0.1} value={hectares} onChange={(e) => setHectares(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-sowing">Fecha de siembra</Label>
              <Input id="campaign-sowing" type="date" value={sowingDate} onChange={(e) => setSowingDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-price">Precio de referencia (US$/t)</Label>
              <Input
                id="campaign-price"
                type="number"
                min={0}
                step={1}
                value={referencePrice}
                onChange={(e) => setReferencePrice(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            El ciclo sale de la fecha de siembra (julio a junio). El precio de referencia estima el margen hasta que haya
            ventas.
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={isPending || !pastureId} onClick={save}>
            {isPending ? "Guardando..." : "Crear campaña"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
