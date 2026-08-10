"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  createSupplyCategoryAction,
  removeSupplyCategoryAction,
} from "./actions";

interface SupplyCategoryItem {
  id: string;
  name: string;
  code: string | null;
}

interface SupplyCategoriesTabProps {
  items: SupplyCategoryItem[];
  canManage: boolean;
  canDelete: boolean;
}

export function SupplyCategoriesTab({ items, canManage, canDelete }: SupplyCategoriesTabProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<SupplyCategoryItem | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !canManage) return;
    startTransition(async () => {
      const result = await createSupplyCategoryAction(name.trim(), code.trim() || undefined);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo crear la categoría.");
        return;
      }
      setName("");
      setCode("");
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startDelete(async () => {
      const result = await removeSupplyCategoryAction(deleteTarget.id);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo eliminar la categoría.");
        return;
      }
      setDeleteTarget(null);
    });
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-end"
      >
        <div className="flex-1 space-y-1.5">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nueva categoría de insumo (ej. Alimento, Sanidad)"
            disabled={!canManage}
          />
        </div>
        <div className="sm:w-48 space-y-1.5">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Código interno (opcional)"
            disabled={!canManage}
          />
        </div>
        <Button type="submit" disabled={!canManage || !name.trim() || isPending}>
          Agregar categoría
        </Button>
      </form>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
          <Package className="text-muted-foreground" />
          <p className="font-medium text-foreground">Sin categorías de insumos</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border shadow-soft">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <span className="text-sm font-medium">{item.name}</span>
                {item.code ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Código: {item.code}
                  </span>
                ) : null}
              </div>
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
            </li>
          ))}
        </ul>
      )}

      <p className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
        Para agregar, editar o eliminar insumos concretos (stock, cantidades, costos),
        andá a la sección Insumos del menú principal.
      </p>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar categoría de insumo"
        description="¿Eliminar esta categoría de insumo? Los insumos existentes mantendrán el vínculo hasta que actualices el modelo."
        confirmLabel="Eliminar"
        confirmVariant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
