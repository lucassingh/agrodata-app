"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet } from "lucide-react";
import { aggregateWeighingRows } from "@repo/core/livestock/livestock-math";
import { Button, buttonVariants } from "@/components/ui/button";
import { Combobox } from "@/components/combobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createWeighingAction, importWeighingsAction } from "./actions";
import { parseWeighingsFile, type ParsedWeighings } from "./parse-weighings";

function todayInArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}
const number = (value: number, digits = 0) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: digits }).format(value);

/** Pesada de un grupo cargada a mano. */
export function WeighingDialog({
  pastures,
  categories,
  onClose,
}: {
  pastures: { id: string; name: string }[];
  categories: string[];
  onClose: () => void;
}) {
  const [pastureId, setPastureId] = useState(pastures[0]?.id ?? "");
  const [animalType, setAnimalType] = useState(categories[0] ?? "");
  const [date, setDate] = useState(todayInArgentina());
  const [heads, setHeads] = useState("");
  const [kg, setKg] = useState("");
  const [isPending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await createWeighingAction({
        pastureId,
        animalType,
        date,
        headCount: Number(heads),
        averageKg: Number(kg),
      });
      if (!result.success) return void toast.error(result.error);
      toast.success(
        result.data !== null && result.data !== undefined
          ? `Pesada guardada · ADPV ${number(result.data, 3)} kg/día`
          : "Pesada guardada",
      );
      onClose();
    });

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cargar pesada</DialogTitle>
          <DialogDescription>El peso promedio del grupo. Con dos pesadas del mismo grupo sale el ADPV.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label htmlFor="weighing-pasture" className="text-xs">Potrero o corral</Label>
            <Select items={pastures.map((p) => ({ value: p.id, label: p.name }))} value={pastureId} onValueChange={(v: string | null) => v && setPastureId(v)}>
              <SelectTrigger id="weighing-pasture" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pastures.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Categoría</Label>
            <Combobox
              options={categories.map((c) => ({ value: c, label: c }))}
              value={animalType}
              onChange={setAnimalType}
              onCreateNew={async (label) => ({ value: label, label })}
              placeholder="Terneros, novillos…"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="weighing-date" className="text-xs">Fecha</Label>
            <Input id="weighing-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="weighing-heads" className="text-xs">Cabezas pesadas</Label>
            <Input id="weighing-heads" type="number" min={1} value={heads} onChange={(e) => setHeads(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label htmlFor="weighing-kg" className="text-xs">Peso promedio (kg)</Label>
            <Input id="weighing-kg" type="number" min={0} step="0.1" value={kg} onChange={(e) => setKg(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={isPending || !pastureId || !animalType} onClick={save}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Importa una planilla de pesadas: muestra cómo quedan los grupos antes de cargar. */
export function ImportWeighingsDialog({ onClose }: { onClose: () => void }) {
  const [defaultDay, setDefaultDay] = useState(todayInArgentina());
  const [parsed, setParsed] = useState<ParsedWeighings | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const groups = useMemo(() => (parsed ? aggregateWeighingRows(parsed.rows) : []), [parsed]);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    try {
      setParsed(await parseWeighingsFile(file, defaultDay));
    } catch {
      toast.error("No se pudo leer la planilla. Usá un .xlsx o .csv como la plantilla.");
      setParsed(null);
    }
  };

  const importNow = () =>
    startTransition(async () => {
      const result = await importWeighingsAction(groups);
      if (!result.success) return void toast.error(result.error);
      toast.success(`${result.data} ${result.data === 1 ? "pesada cargada" : "pesadas cargadas"}`);
      onClose();
    });

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar planilla de pesadas</DialogTitle>
          <DialogDescription>
            Una fila por animal (sin cantidad) o por grupo (peso promedio y cantidad). Se promedia por potrero, categoría y
            fecha.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <a href="/plantilla_pesadas.xlsx" download className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Download size={14} aria-hidden />
            Descargar plantilla
          </a>
          <div className="space-y-1">
            <Label htmlFor="import-day" className="text-xs">Fecha para filas sin fecha</Label>
            <Input id="import-day" type="date" className="h-8 w-40" value={defaultDay} onChange={(e) => setDefaultDay(e.target.value)} />
          </div>
        </div>

        <label
          htmlFor="import-file"
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground hover:bg-muted/40"
        >
          <FileSpreadsheet className="text-primary" aria-hidden />
          {fileName ?? "Elegí el archivo (.xlsx, .xls o .csv)"}
          <input
            id="import-file"
            type="file"
            accept=".xlsx,.xls,.csv"
            className="sr-only"
            onChange={(e) => void readFile(e.target.files?.[0])}
          />
        </label>

        {parsed ? (
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">{parsed.rows.length}</span> {parsed.rows.length === 1 ? "fila leída" : "filas leídas"} →{" "}
              <span className="font-medium">{groups.length}</span> {groups.length === 1 ? "pesada" : "pesadas"} por grupo
            </p>
            {groups.length > 0 ? (
              <ul className="max-h-56 divide-y divide-border overflow-auto rounded-lg border border-border text-sm">
                {groups.map((g) => (
                  <li key={`${g.pasture}|${g.animalType}|${g.day}`} className="flex justify-between gap-3 px-3 py-1.5">
                    <span>
                      {g.animalType} · {g.pasture}
                    </span>
                    <span className="text-muted-foreground">
                      {g.day.slice(8, 10)}/{g.day.slice(5, 7)} · {g.headCount} cab · {number(g.averageKg, 1)} kg
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {parsed.skipped.length > 0 ? (
              <p className="text-xs text-[#8A5A12]">
                Se saltearon {parsed.skipped.length} {parsed.skipped.length === 1 ? "fila" : "filas"}:{" "}
                {parsed.skipped.slice(0, 5).map((s) => `fila ${s.line} (${s.reason})`).join(", ")}
                {parsed.skipped.length > 5 ? "…" : ""}
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={isPending || groups.length === 0} onClick={importNow}>
            {isPending ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
