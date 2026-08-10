"use client";

import { Sprout } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CowHeadIcon } from "@/components/cow-head-icon";
import type { Pasture } from "./types";

export function PastureDetailDialog({
  pasture,
  onClose,
}: {
  pasture: Pasture;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(next: boolean) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalle del potrero</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Nombre</p>
            <p className="font-medium">{pasture.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Superficie</p>
            <p className="font-medium">
              {pasture.hectares ? `${pasture.hectares} ha` : "Sin superficie definida"}
            </p>
          </div>
          <div>
            <p className="mb-1.5 text-sm text-muted-foreground">Cultivos</p>
            {pasture.crops.length === 0 ? (
              <p className="text-sm">Sin cultivos</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {pasture.crops.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 rounded-full bg-[#E8F5EE] px-2 py-0.5 text-xs font-medium text-[#2D6A4F]"
                  >
                    <Sprout size={11} />
                    {c.crop}
                    {c.hectares ? ` · ${c.hectares} ha` : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-sm text-muted-foreground">Animales</p>
            {pasture.animals.length === 0 ? (
              <p className="text-sm">Sin animales</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {pasture.animals.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1 rounded-full bg-[#FDF4E3] px-2 py-0.5 text-xs font-medium text-[#7C6445]"
                  >
                    <CowHeadIcon size={11} />
                    {a.quantity} {a.animalType}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
