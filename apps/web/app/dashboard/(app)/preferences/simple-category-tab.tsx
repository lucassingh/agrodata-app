"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { colorForKey } from "@/lib/color-for-key";

interface SimpleItem {
  id: string;
  name: string;
  color?: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

interface SimpleCategoryTabProps {
  items: SimpleItem[];
  canManage: boolean;
  canDelete: boolean;
  addPlaceholder: string;
  addButtonLabel: string;
  emptyIcon: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  deleteDialogTitle: string;
  deleteDialogDescription: (name: string) => string;
  onCreate: (name: string) => Promise<ActionResult>;
  onDelete: (id: string) => Promise<ActionResult>;
}

export function SimpleCategoryTab({
  items,
  canManage,
  canDelete,
  addPlaceholder,
  addButtonLabel,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  deleteDialogTitle,
  deleteDialogDescription,
  onCreate,
  onDelete,
}: SimpleCategoryTabProps) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<SimpleItem | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !canManage) return;
    startTransition(async () => {
      const result = await onCreate(name.trim());
      if (!result.success) {
        toast.error(result.error ?? "No se pudo crear.");
        return;
      }
      setName("");
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startDelete(async () => {
      const result = await onDelete(deleteTarget.id);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo eliminar.");
        return;
      }
      setDeleteTarget(null);
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="flex items-end gap-2 rounded-xl border border-border bg-card p-4 shadow-soft">
        <div className="flex-1 space-y-1.5">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={addPlaceholder}
            disabled={!canManage}
          />
        </div>
        <Button type="submit" disabled={!canManage || !name.trim() || isPending}>
          {addButtonLabel}
        </Button>
      </form>
      {!canManage ? (
        <p className="text-sm text-muted-foreground">
          Tu rol no puede crear ni editar esta lista.
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
          <div className="text-muted-foreground">{emptyIcon}</div>
          <p className="font-medium text-foreground">{emptyTitle}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border shadow-soft">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: item.color ?? colorForKey(item.id) }}
                />
                <span className="text-sm font-medium">{item.name}</span>
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteDialogTitle}
        description={deleteTarget ? deleteDialogDescription(deleteTarget.name) : undefined}
        confirmLabel="Eliminar"
        confirmVariant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
