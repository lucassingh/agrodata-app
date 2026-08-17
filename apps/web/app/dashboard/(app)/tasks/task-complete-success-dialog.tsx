"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { addTaskRecordAction } from "./actions";
import { TASK_TYPE_LABEL, titleCase } from "./task-labels";
import type { Task } from "./types";

interface TaskCompleteSuccessDialogProps {
  task: Task;
  onClose: () => void;
}

/** Puerto directo del modal de éxito post-completado del legacy: paso manual y
 *  opcional para dejar constancia en el Historial, nunca automático. */
export function TaskCompleteSuccessDialog({ task, onClose }: TaskCompleteSuccessDialogProps) {
  const [isPending, startTransition] = useTransition();
  const typeLabel = TASK_TYPE_LABEL[task.type];

  const handleAddRecord = () => {
    startTransition(async () => {
      const result = await addTaskRecordAction(task.id);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo agregar el dato");
      } else {
        toast.success("Dato agregado correctamente");
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
          <h2 className="font-heading text-lg font-semibold">
            ¡Tarea de {typeLabel.toLowerCase()} marcada como completada!
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          <Button className="w-full" disabled={isPending} onClick={handleAddRecord}>
            {isPending ? "Agregando..." : `Agregar Dato De ${titleCase(typeLabel)}`}
          </Button>
          <Button className="w-full" variant="ghost" disabled={isPending} onClick={onClose}>
            No Ingresar Dato
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
