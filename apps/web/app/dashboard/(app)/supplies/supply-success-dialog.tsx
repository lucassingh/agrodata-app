"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { addSupplyPurchaseRecordAction } from "./actions";

interface SupplySuccessDialogProps {
  supply: { id: string; name: string; categoryName: string };
  onClose: () => void;
}

/** Puerto directo del diálogo de éxito post-creación del legacy: paso manual y
 *  opcional para dejar constancia en el Historial, nunca automático. */
export function SupplySuccessDialog({ supply, onClose }: SupplySuccessDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleAddToHistory = () => {
    startTransition(async () => {
      const result = await addSupplyPurchaseRecordAction(supply.id);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo agregar el dato");
      } else {
        toast.success("Dato agregado al historial");
      }
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span className="flex size-16 items-center justify-center rounded-full border-[3px] border-success">
            <Check size={32} className="text-success" />
          </span>
          <h2 className="font-heading text-lg font-semibold">¡Insumo agregado correctamente!</h2>
          <p className="text-sm text-muted-foreground">
            {supply.name} · {supply.categoryName}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button className="w-full" disabled={isPending} onClick={handleAddToHistory}>
            {isPending ? "Agregando..." : "Agregar dato al historial"}
          </Button>
          <Button
            className="w-full"
            variant="ghost"
            disabled={isPending}
            onClick={onClose}
          >
            No agregar dato
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
