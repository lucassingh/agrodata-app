"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Package, Fence, FlaskConical, Trash2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSectionHeader } from "@/components/form-section-header";
import { CowHeadIcon } from "@/components/cow-head-icon";
import { Combobox, type ComboboxOption } from "@/components/combobox";
import { formatDateOnly } from "@/lib/format-date-only";
import { createTaskAction } from "./actions";
import { TASK_TYPE_LABEL } from "./task-labels";
import { TaskPreviewCard } from "./task-preview-card";
import type { TaskType } from "./types";
import type { CreateTaskInput } from "@repo/core/tasks/tasks.schema";

interface ProductRow { key: string; productName: string; dosis: string; unit: string }
interface PastureRow { key: string; pastureId: string; hectares: string }
interface AnimalRow { key: string; quantity: string; animalType: string }
interface FertilizerRow { key: string; source: string; dosis: string; unit: string }
interface ResponsibleRow { key: string; memberId: string }

let rowKeySeq = 0;
function nextKey() {
  rowKeySeq += 1;
  return `row-${rowKeySeq}`;
}

interface TaskCreateDialogProps {
  taskType: TaskType;
  pastureOptions: ComboboxOption[];
  animalOptions: ComboboxOption[];
  teamMembers: { userId: string; fullName: string }[];
  currentUserFullName: string;
  onClose: () => void;
}

export function TaskCreateDialog({
  taskType,
  pastureOptions,
  animalOptions,
  teamMembers,
  currentUserFullName,
  onClose,
}: TaskCreateDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [deadline, setDeadline] = useState("");
  const [treatment, setTreatment] = useState("");
  const [crop, setCrop] = useState("");
  const [genetic, setGenetic] = useState("");
  const [spacing, setSpacing] = useState("");
  const [density, setDensity] = useState("");
  const [densityUnit, setDensityUnit] = useState<"mts2" | "has">("has");
  const [contractor, setContractor] = useState("");
  const [description, setDescription] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [pastures, setPastures] = useState<PastureRow[]>([]);
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [fertilizers, setFertilizers] = useState<FertilizerRow[]>([]);
  const [responsibles, setResponsibles] = useState<ResponsibleRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const memberOptions: ComboboxOption[] = teamMembers.map((m) => ({ value: m.userId, label: m.fullName }));

  const handleContinue = () => {
    if (!deadline) {
      setError("Indicá la fecha límite");
      return;
    }
    setError(null);
    setStep(2);
  };

  function buildPayload(): CreateTaskInput {
    const filteredProducts = products
      .filter((p) => p.productName.trim())
      .map((p) => ({ productName: p.productName.trim(), dosis: p.dosis.trim() || undefined, unit: p.unit.trim() || undefined }));
    const filteredPastures = pastures
      .filter((p) => p.pastureId)
      .map((p) => ({ pastureId: p.pastureId, hectares: p.hectares.trim() || undefined }));
    const filteredAnimals = animals
      .filter((a) => a.quantity && Number(a.quantity) > 0 && a.animalType)
      .map((a) => ({ quantity: Number(a.quantity), animalType: a.animalType }));
    const filteredFertilizers = fertilizers
      .filter((f) => f.source.trim())
      .map((f) => ({ source: f.source.trim(), dosis: f.dosis.trim() || undefined, unit: f.unit.trim() || undefined }));

    const base = {
      type: taskType,
      deadline,
      description: description.trim() || undefined,
    };

    switch (taskType) {
      case "TRATAMIENTO_SANITARIO":
        return {
          ...base,
          treatment: treatment.trim() || undefined,
          products: filteredProducts,
          pastures: filteredPastures,
          animals: filteredAnimals,
        };
      case "ORDEN_SIEMBRA":
        return {
          ...base,
          treatment: treatment.trim() || undefined,
          pastures: filteredPastures,
          crop: crop.trim() || undefined,
          genetic: genetic.trim() || undefined,
          spacing: spacing.trim() || undefined,
          density: density.trim() || undefined,
          densityUnit,
          contractor: contractor.trim() || undefined,
          fertilizers: filteredFertilizers,
        };
      case "PULVERIZACION":
        return {
          ...base,
          pastures: filteredPastures,
          crop: crop.trim() || undefined,
          contractor: contractor.trim() || undefined,
          products: filteredProducts,
        };
      case "FERTILIZACION":
        return {
          ...base,
          pastures: filteredPastures,
          crop: crop.trim() || undefined,
          contractor: contractor.trim() || undefined,
          fertilizers: filteredFertilizers,
        };
    }
  }

  const handleConfirm = (responsiblesOverride?: ResponsibleRow[]) => {
    const list = responsiblesOverride ?? responsibles;
    const mainResponsibleId = list.length > 0 && list[0]!.memberId ? list[0]!.memberId : undefined;
    const payload: CreateTaskInput = { ...buildPayload(), responsibleId: mainResponsibleId };
    startTransition(async () => {
      const result = await createTaskAction(payload);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo crear la tarea");
        return;
      }
      toast.success("Tarea creada");
      onClose();
    });
  };

  const renderDeadlineField = () => (
    <div className="space-y-2">
      <Label>Fecha límite</Label>
      <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required autoFocus />
    </div>
  );

  const renderTreatmentField = () => (
    <div className="space-y-2">
      <Label>Tratamiento</Label>
      <Input value={treatment} onChange={(e) => setTreatment(e.target.value)} />
    </div>
  );

  const renderCropField = () => (
    <div className="space-y-2">
      <Label>Cultivo</Label>
      <Input value={crop} onChange={(e) => setCrop(e.target.value)} />
    </div>
  );

  const renderContractorField = () => (
    <div className="space-y-2">
      <Label>Contratista (opcional)</Label>
      <Input value={contractor} onChange={(e) => setContractor(e.target.value)} />
    </div>
  );

  const renderDescriptionField = () => (
    <div className="space-y-2">
      <Label>Descripción</Label>
      <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
    </div>
  );

  const renderGeneticSpacingDensityFields = () => (
    <>
      <div className="space-y-2">
        <Label>Genética (opcional)</Label>
        <Input value={genetic} onChange={(e) => setGenetic(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Espaciamiento (opcional)</Label>
        <Input value={spacing} onChange={(e) => setSpacing(e.target.value)} />
      </div>
      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <Label>Densidad</Label>
          <Input value={density} onChange={(e) => setDensity(e.target.value)} />
        </div>
        <div className="w-28 space-y-2">
          <Label>Unidad</Label>
          <Select
            items={[{ value: "mts2", label: "mts²" }, { value: "has", label: "has" }]}
            value={densityUnit}
            onValueChange={(v: string | null) => v && setDensityUnit(v as "mts2" | "has")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mts2">mts²</SelectItem>
              <SelectItem value="has">has</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );

  const renderProductsSection = () => (
    <div className="space-y-3">
      <FormSectionHeader
        icon={<Package size={14} />}
        title="Productos"
        color="#3B82F6"
        count={products.length}
        actionLabel="Agregar producto"
        onAction={() => setProducts((p) => [...p, { key: nextKey(), productName: "", dosis: "", unit: "" }])}
      />
      {products.map((row, index) => (
        <div key={row.key} className="grid grid-cols-[1fr_100px_100px_auto] items-end gap-2">
          <div className="space-y-1">
            {index === 0 ? <Label className="text-xs">Producto</Label> : null}
            <Input
              value={row.productName}
              onChange={(e) =>
                setProducts((prev) => prev.map((r) => (r.key === row.key ? { ...r, productName: e.target.value } : r)))
              }
            />
          </div>
          <div className="space-y-1">
            {index === 0 ? <Label className="text-xs">Dosis</Label> : null}
            <Input
              value={row.dosis}
              onChange={(e) =>
                setProducts((prev) => prev.map((r) => (r.key === row.key ? { ...r, dosis: e.target.value } : r)))
              }
            />
          </div>
          <div className="space-y-1">
            {index === 0 ? <Label className="text-xs">Unidad</Label> : null}
            <Input
              value={row.unit}
              onChange={(e) =>
                setProducts((prev) => prev.map((r) => (r.key === row.key ? { ...r, unit: e.target.value } : r)))
              }
            />
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => setProducts((prev) => prev.filter((r) => r.key !== row.key))}>
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
    </div>
  );

  const renderPasturesSection = () => (
    <div className="space-y-3">
      <FormSectionHeader
        icon={<Fence size={14} />}
        title="Potreros"
        color="#2D6A4F"
        count={pastures.length}
        actionLabel="Agregar potrero"
        onAction={() => setPastures((p) => [...p, { key: nextKey(), pastureId: "", hectares: "" }])}
      />
      {pastures.map((row, index) => (
        <div key={row.key} className="grid grid-cols-[1fr_110px_auto] items-end gap-2">
          <div className="space-y-1">
            {index === 0 ? <Label className="text-xs">Potrero</Label> : null}
            <Combobox
              options={pastureOptions}
              value={row.pastureId}
              onChange={(v) => setPastures((prev) => prev.map((r) => (r.key === row.key ? { ...r, pastureId: v } : r)))}
              placeholder="Seleccionar…"
            />
          </div>
          <div className="space-y-1">
            {index === 0 ? <Label className="text-xs">Hectáreas</Label> : null}
            <Input
              value={row.hectares}
              onChange={(e) =>
                setPastures((prev) => prev.map((r) => (r.key === row.key ? { ...r, hectares: e.target.value } : r)))
              }
            />
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => setPastures((prev) => prev.filter((r) => r.key !== row.key))}>
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
    </div>
  );

  const renderAnimalsSection = () => (
    <div className="space-y-3">
      <FormSectionHeader
        icon={<CowHeadIcon size={14} />}
        title="Animales"
        color="#7C6445"
        count={animals.length}
        actionLabel="Agregar animales"
        onAction={() => setAnimals((p) => [...p, { key: nextKey(), quantity: "", animalType: "" }])}
      />
      {animals.map((row, index) => (
        <div key={row.key} className="grid grid-cols-[100px_1fr_auto] items-end gap-2">
          <div className="space-y-1">
            {index === 0 ? <Label className="text-xs">Cantidad</Label> : null}
            <Input
              type="number"
              min={0}
              value={row.quantity}
              onChange={(e) =>
                setAnimals((prev) => prev.map((r) => (r.key === row.key ? { ...r, quantity: e.target.value } : r)))
              }
            />
          </div>
          <div className="space-y-1">
            {index === 0 ? <Label className="text-xs">Tipo de animal</Label> : null}
            <Combobox
              options={animalOptions}
              value={row.animalType}
              onChange={(v) => setAnimals((prev) => prev.map((r) => (r.key === row.key ? { ...r, animalType: v } : r)))}
              placeholder="Elegí un tipo"
            />
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => setAnimals((prev) => prev.filter((r) => r.key !== row.key))}>
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
    </div>
  );

  const renderFertilizersSection = () => (
    <div className="space-y-3">
      <FormSectionHeader
        icon={<FlaskConical size={14} />}
        title="Fertilizantes"
        color="#10B981"
        count={fertilizers.length}
        actionLabel="Agregar fertilizante"
        onAction={() => setFertilizers((p) => [...p, { key: nextKey(), source: "", dosis: "", unit: "kg" }])}
      />
      {fertilizers.map((row, index) => (
        <div key={row.key} className="grid grid-cols-[1fr_100px_90px_auto] items-end gap-2">
          <div className="space-y-1">
            {index === 0 ? <Label className="text-xs">Fuente</Label> : null}
            <Input
              value={row.source}
              onChange={(e) =>
                setFertilizers((prev) => prev.map((r) => (r.key === row.key ? { ...r, source: e.target.value } : r)))
              }
            />
          </div>
          <div className="space-y-1">
            {index === 0 ? <Label className="text-xs">Dosis</Label> : null}
            <Input
              value={row.dosis}
              onChange={(e) =>
                setFertilizers((prev) => prev.map((r) => (r.key === row.key ? { ...r, dosis: e.target.value } : r)))
              }
            />
          </div>
          <div className="space-y-1">
            {index === 0 ? <Label className="text-xs">Unidad</Label> : null}
            <Select
              items={[{ value: "kg", label: "kg" }, { value: "lts", label: "lts" }]}
              value={row.unit}
              onValueChange={(v: string | null) =>
                v && setFertilizers((prev) => prev.map((r) => (r.key === row.key ? { ...r, unit: v } : r)))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="lts">lts</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => setFertilizers((prev) => prev.filter((r) => r.key !== row.key))}>
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
    </div>
  );

  const renderStep1Fields = () => {
    switch (taskType) {
      case "TRATAMIENTO_SANITARIO":
        return (
          <>
            {renderTreatmentField()}
            {renderProductsSection()}
            {renderPasturesSection()}
            {renderAnimalsSection()}
            {renderDescriptionField()}
          </>
        );
      case "ORDEN_SIEMBRA":
        return (
          <>
            {renderTreatmentField()}
            {renderPasturesSection()}
            {renderCropField()}
            {renderGeneticSpacingDensityFields()}
            {renderContractorField()}
            {renderFertilizersSection()}
            {renderDescriptionField()}
          </>
        );
      case "PULVERIZACION":
        return (
          <>
            {renderPasturesSection()}
            {renderCropField()}
            {renderContractorField()}
            {renderProductsSection()}
            {renderDescriptionField()}
          </>
        );
      case "FERTILIZACION":
        return (
          <>
            {renderPasturesSection()}
            {renderCropField()}
            {renderContractorField()}
            {renderFertilizersSection()}
            {renderDescriptionField()}
          </>
        );
    }
  };

  const pastureNames = pastures
    .filter((p) => p.pastureId)
    .map((p) => pastureOptions.find((o) => o.value === p.pastureId)?.label ?? p.pastureId);
  const previewAnimals = animals
    .filter((a) => a.quantity && Number(a.quantity) > 0 && a.animalType)
    .map((a) => ({ quantity: Number(a.quantity), animalType: a.animalType }));
  const previewProducts = products
    .filter((p) => p.productName.trim())
    .map((p) => ({ productName: p.productName.trim(), dosis: p.dosis.trim() || undefined }));
  const previewFertilizers = fertilizers
    .filter((f) => f.source.trim())
    .map((f) => ({ source: f.source.trim(), dosis: f.dosis.trim() || undefined }));

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>{TASK_TYPE_LABEL[taskType]}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
              {renderDeadlineField()}
              {renderStep1Fields()}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleContinue}>Continuar</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Asignar Responsables</DialogTitle>
            </DialogHeader>
            <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Vista previa</p>
                <TaskPreviewCard
                  type={taskType}
                  deadlineLabel={deadline ? formatDateOnly(new Date(deadline)) : "—"}
                  generatedByName={currentUserFullName}
                  treatment={treatment.trim() || null}
                  crop={crop.trim() || null}
                  pastureNames={pastureNames}
                  animals={previewAnimals}
                  products={previewProducts}
                  fertilizers={previewFertilizers}
                  description={description.trim() || null}
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Responsables (Opcional)</p>
                {responsibles.map((row) => (
                  <div key={row.key} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Persona</Label>
                      <Combobox
                        options={memberOptions}
                        value={row.memberId}
                        onChange={(v) =>
                          setResponsibles((prev) => prev.map((r) => (r.key === row.key ? { ...r, memberId: v } : r)))
                        }
                        placeholder="Seleccionar…"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setResponsibles((prev) => prev.filter((r) => r.key !== row.key))}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setResponsibles((prev) => [...prev, { key: nextKey(), memberId: "" }])}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground hover:bg-muted"
                >
                  <UserPlus size={14} />
                  Agregar Responsable
                </button>
              </div>
            </div>
            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="ghost" disabled={isPending} onClick={() => setStep(1)}>
                Volver
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    setResponsibles([]);
                    handleConfirm([]);
                  }}
                >
                  No Agregar Responsable
                </Button>
                <Button disabled={isPending} onClick={() => handleConfirm()}>
                  {isPending ? "Creando..." : "Confirmar"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
