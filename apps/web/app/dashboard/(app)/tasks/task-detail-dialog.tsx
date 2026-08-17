"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDateOnly } from "@/lib/format-date-only";
import { TaskPreviewCard } from "./task-preview-card";
import type { Task } from "./types";

interface TaskDetailDialogProps {
  task: Task;
  onClose: () => void;
}

export function TaskDetailDialog({ task, onClose }: TaskDetailDialogProps) {
  return (
    <Dialog open onOpenChange={(next: boolean) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalle de la tarea</DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <TaskPreviewCard
            type={task.type}
            deadlineLabel={formatDateOnly(task.deadline)}
            responsibleName={task.responsible ? `${task.responsible.name} ${task.responsible.lastname}` : undefined}
            treatment={task.treatment}
            crop={task.crop}
            pastureNames={task.pastures.map((p) => p.pasture?.name ?? p.pastureId)}
            animals={task.animals}
            products={task.products}
            fertilizers={task.fertilizers}
            description={task.description}
          />
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
