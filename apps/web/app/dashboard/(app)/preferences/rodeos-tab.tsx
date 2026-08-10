"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Leaf, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { createRodeoAction, updateRodeoAction, removeRodeoAction } from "./actions";

interface RodeoItem {
  id: string;
  name: string;
  description: string | null;
}

interface RodeosTabProps {
  items: RodeoItem[];
  canManage: boolean;
  canDelete: boolean;
}

export function RodeosTab({ items, canManage, canDelete }: RodeosTabProps) {
  const [dialogState, setDialogState] = useState<
    { mode: "create" } | { mode: "edit"; rodeo: RodeoItem } | null
  >(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<RodeoItem | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const openCreate = () => {
    setName("");
    setDescription("");
    setDialogState({ mode: "create" });
  };

  const openEdit = (rodeo: RodeoItem) => {
    setName(rodeo.name);
    setDescription(rodeo.description ?? "");
    setDialogState({ mode: "edit", rodeo });
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !dialogState) return;
    startTransition(async () => {
      const input = { name: name.trim(), description: description.trim() || undefined };
      const result =
        dialogState.mode === "create"
          ? await createRodeoAction(input)
          : await updateRodeoAction(dialogState.rodeo.id, input);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo guardar el rodeo.");
        return;
      }
      toast.success(dialogState.mode === "create" ? "Rodeo creado." : "Rodeo actualizado.");
      setDialogState(null);
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startDelete(async () => {
      const result = await removeRodeoAction(deleteTarget.id);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo eliminar el rodeo.");
        return;
      }
      setDeleteTarget(null);
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
        <Button type="button" disabled={!canManage} onClick={openCreate}>
          Nuevo rodeo
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
          <Leaf className="text-muted-foreground" />
          <p className="font-medium text-foreground">Sin rodeos configurados</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border shadow-soft">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-sm font-semibold">{item.name}</p>
                {item.description ? (
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!canManage}
                  onClick={() => openEdit(item)}
                >
                  Editar
                </Button>
                {canDelete ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(item)}
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(dialogState)}
        onOpenChange={(next: boolean) => {
          if (!next && !isPending) setDialogState(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {dialogState?.mode === "edit" ? "Editar rodeo" : "Nuevo rodeo"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="rodeo-name">Nombre</Label>
                <Input
                  id="rodeo-name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rodeo-description">Descripción</Label>
                <Textarea
                  id="rodeo-description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setDialogState(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar rodeo"
        description={deleteTarget ? `¿Eliminar el rodeo «${deleteTarget.name}»?` : undefined}
        confirmLabel="Eliminar"
        confirmVariant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
