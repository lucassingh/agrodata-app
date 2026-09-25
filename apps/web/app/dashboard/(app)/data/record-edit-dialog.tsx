"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateRecordAction } from "./actions";
import { recordEffects } from "./record-format";
import type { RecordRow } from "./types";

interface RecordEditDialogProps {
  record: RecordRow;
  onClose: () => void;
}

/** YYYY-MM-DD del registro en huso de Argentina (lo que espera `<input type="date">`). */
function toDateInputValue(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

export function RecordEditDialog({ record, onClose }: RecordEditDialogProps) {
  const data = (record.data ?? {}) as Record<string, unknown>;
  const [occurredAt, setOccurredAt] = useState(toDateInputValue(record.occurredAt));
  const [summary, setSummary] = useState(typeof data.summary === "string" ? data.summary : "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasEffects = recordEffects(record.data).length > 0;

  const handleSave = () => {
    if (!occurredAt || !summary.trim()) {
      setError("Completá la fecha y la descripción");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateRecordAction(record.id, { occurredAt, summary: summary.trim() });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Registro actualizado");
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar registro</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="record-date">Fecha</Label>
            <Input id="record-date" type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="record-summary">Descripción</Label>
            <Textarea id="record-summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          {hasEffects ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Esto corrige el historial. Lo que el mensaje cargó en Gastos, Insumos, Potreros o Tareas se corrige desde
              cada módulo.
            </p>
          ) : null}
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
