"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Fence, Sprout, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CowHeadIcon } from "@/components/cow-head-icon";
import type { ComboboxOption } from "@/components/combobox";
import type { Pasture } from "./types";
import { deletePastureAction } from "./actions";
import { PastureFormDialog } from "./pasture-form-dialog";
import { PastureDetailDialog } from "./pasture-detail-dialog";
import { QuickAddCropDialog } from "./quick-add-crop-dialog";
import { QuickAddAnimalDialog } from "./quick-add-animal-dialog";

interface PasturesClientProps {
  pastures: Pasture[];
  cropOptions: ComboboxOption[];
  animalOptions: ComboboxOption[];
  hasActiveTenant: boolean;
  autoCreate: boolean;
}

export function PasturesClient({
  pastures,
  cropOptions,
  animalOptions,
  hasActiveTenant,
  autoCreate,
}: PasturesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formState, setFormState] = useState<{ mode: "create" } | { mode: "edit"; pasture: Pasture } | null>(
    null,
  );
  const [detailTarget, setDetailTarget] = useState<Pasture | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pasture | null>(null);
  const [quickCropTarget, setQuickCropTarget] = useState<Pasture | null>(null);
  const [quickAnimalTarget, setQuickAnimalTarget] = useState<Pasture | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const autoCreateHandled = useRef(false);

  useEffect(() => {
    if (autoCreate && hasActiveTenant && !autoCreateHandled.current) {
      autoCreateHandled.current = true;
      setFormState({ mode: "create" });
      const params = new URLSearchParams(searchParams.toString());
      params.delete("create");
      router.replace(`/dashboard/pastures${params.toString() ? `?${params}` : ""}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCreate, hasActiveTenant]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    startDelete(async () => {
      const result = await deletePastureAction(deleteTarget.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Potrero eliminado");
      setDeleteTarget(null);
    });
  };

  const columns: DataTableColumn<Pasture>[] = [
    {
      key: "name",
      label: "Potrero",
      render: (p) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Fence size={15} />
          </span>
          <div>
            <p className="font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">
              {p.hectares ? `${p.hectares} ha` : "Sin superficie"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "crops",
      label: "Cultivos",
      render: (p) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {p.crops.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 rounded-full bg-[#E8F5EE] px-2 py-0.5 text-xs font-medium text-[#2D6A4F]"
            >
              <Sprout size={11} />
              {c.crop}
            </span>
          ))}
          <Button
            variant="ghost"
            size="icon-sm"
            title="Agregar cultivo"
            onClick={() => setQuickCropTarget(p)}
          >
            <Plus size={13} />
          </Button>
        </div>
      ),
    },
    {
      key: "animals",
      label: "Animales",
      render: (p) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {p.animals.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 rounded-full bg-[#FDF4E3] px-2 py-0.5 text-xs font-medium text-[#7C6445]"
            >
              <CowHeadIcon size={11} />
              {a.quantity} {a.animalType}
            </span>
          ))}
          <Button
            variant="ghost"
            size="icon-sm"
            title="Agregar animales"
            onClick={() => setQuickAnimalTarget(p)}
          >
            <Plus size={13} />
          </Button>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-sm" title="Ver detalle" onClick={() => setDetailTarget(p)}>
            <Eye size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Editar"
            onClick={() => setFormState({ mode: "edit", pasture: p })}
          >
            <Pencil size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Eliminar"
            onClick={() => setDeleteTarget(p)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          disabled={!hasActiveTenant}
          title={!hasActiveTenant ? "Seleccioná o creá un establecimiento" : undefined}
          onClick={() => setFormState({ mode: "create" })}
        >
          <Plus size={14} />
          Agregar potrero
        </Button>
      </div>

      {!hasActiveTenant ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Sin establecimiento activo. Elegí o creá un campo desde el menú de usuario.
        </div>
      ) : pastures.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Todavía no cargaste potreros.
        </div>
      ) : (
        <DataTable rows={pastures} columns={columns} />
      )}

      {formState ? (
        <PastureFormDialog
          mode={formState.mode}
          pasture={formState.mode === "edit" ? formState.pasture : undefined}
          cropOptions={cropOptions}
          animalOptions={animalOptions}
          onClose={() => setFormState(null)}
        />
      ) : null}

      {detailTarget ? (
        <PastureDetailDialog pasture={detailTarget} onClose={() => setDetailTarget(null)} />
      ) : null}

      {quickCropTarget ? (
        <QuickAddCropDialog
          pasture={quickCropTarget}
          cropOptions={cropOptions}
          onClose={() => setQuickCropTarget(null)}
        />
      ) : null}

      {quickAnimalTarget ? (
        <QuickAddAnimalDialog
          pasture={quickAnimalTarget}
          animalOptions={animalOptions}
          onClose={() => setQuickAnimalTarget(null)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar potrero"
        description={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.name}»? Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        confirmVariant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
