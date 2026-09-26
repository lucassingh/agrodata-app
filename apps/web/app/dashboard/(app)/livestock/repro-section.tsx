"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { HeartPulse, Plus, Trash2 } from "lucide-react";
import type { ReproSeason } from "@repo/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createReproEventAction, deleteReproEventAction } from "./actions";

type EventType = "SERVICE_START" | "PREGNANCY_CHECK" | "WEANING";

const EVENT_LABEL: Record<string, string> = {
  SERVICE_START: "Inicio de servicio",
  PREGNANCY_CHECK: "Tacto",
  CALVING: "Partos",
  WEANING: "Destete",
};
const NO_RODEO = "none";
const pct = (value: number | null) => (value === null ? "—" : `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(value)} %`);
const count = (value: number | null) => (value === null ? "—" : new Intl.NumberFormat("es-AR").format(value));
const fullDay = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;

function todayInArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

function eventSummary(e: ReproSeason["events"][number]): string {
  if (e.type === "SERVICE_START") return `${e.females ?? "—"} vacas`;
  if (e.type === "PREGNANCY_CHECK") return `${e.pregnant ?? "—"} preñadas · ${e.empty ?? "—"} vacías`;
  if (e.type === "WEANING") return `${e.weaned ?? "—"} terneros`;
  return "";
}

function ReproEventDialog({ rodeos, onClose }: { rodeos: { id: string; name: string }[]; onClose: () => void }) {
  const [type, setType] = useState<EventType>("PREGNANCY_CHECK");
  const [date, setDate] = useState(todayInArgentina());
  const [rodeoId, setRodeoId] = useState(NO_RODEO);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [isPending, startTransition] = useTransition();
  const n = (value: string) => (value.trim() === "" ? undefined : Number(value));

  const save = () =>
    startTransition(async () => {
      const result = await createReproEventAction({
        type,
        date,
        rodeoId: rodeoId === NO_RODEO ? undefined : rodeoId,
        females: type === "SERVICE_START" ? n(a) : undefined,
        pregnant: type === "PREGNANCY_CHECK" ? n(a) : undefined,
        empty: type === "PREGNANCY_CHECK" ? n(b) : undefined,
        weaned: type === "WEANING" ? n(a) : undefined,
      });
      if (!result.success) return void toast.error(result.error);
      toast.success(`${EVENT_LABEL[type]} guardado`);
      onClose();
    });

  const typeItems = (["SERVICE_START", "PREGNANCY_CHECK", "WEANING"] as const).map((value) => ({ value, label: EVENT_LABEL[value]! }));
  const rodeoItems = [{ value: NO_RODEO, label: "Sin rodeo" }, ...rodeos.map((r) => ({ value: r.id, label: r.name }))];

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cargar evento reproductivo</DialogTitle>
          <DialogDescription>Los partos se cargan como nacimientos (en Potreros o por WhatsApp): suman los terneros.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="repro-type" className="text-xs">Evento</Label>
            <Select items={typeItems} value={type} onValueChange={(v: string | null) => v && setType(v as EventType)}>
              <SelectTrigger id="repro-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="repro-date" className="text-xs">Fecha</Label>
            <Input id="repro-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label htmlFor="repro-rodeo" className="text-xs">Rodeo</Label>
            <Select items={rodeoItems} value={rodeoId} onValueChange={(v: string | null) => v && setRodeoId(v)}>
              <SelectTrigger id="repro-rodeo" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rodeoItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={type === "PREGNANCY_CHECK" ? "space-y-1" : "col-span-2 space-y-1"}>
            <Label htmlFor="repro-a" className="text-xs">
              {type === "SERVICE_START" ? "Vacas en servicio" : type === "PREGNANCY_CHECK" ? "Preñadas" : "Terneros destetados"}
            </Label>
            <Input id="repro-a" type="number" min={0} value={a} onChange={(e) => setA(e.target.value)} />
          </div>
          {type === "PREGNANCY_CHECK" ? (
            <div className="space-y-1">
              <Label htmlFor="repro-b" className="text-xs">Vacías</Label>
              <Input id="repro-b" type="number" min={0} value={b} onChange={(e) => setB(e.target.value)} />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={isPending || !a} onClick={save}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Índices reproductivos por temporada de servicio y los eventos que los arman. */
export function ReproSection({
  seasons,
  rodeos,
  canEdit,
}: {
  seasons: ReproSeason[];
  rodeos: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const remove = (id: string) =>
    startTransition(async () => {
      const result = await deleteReproEventAction(id);
      if (!result.success) return void toast.error(result.error);
      toast.success("Evento borrado");
    });

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-heading text-sm font-bold">Reproducción</p>
            <p className="text-xs text-muted-foreground">Por temporada de servicio: servicio, tacto, partos (nacimientos) y destete.</p>
          </div>
          {canEdit ? (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus size={14} />
              Cargar evento
            </Button>
          ) : null}
        </div>

        {seasons.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            <HeartPulse className="shrink-0 text-muted-foreground" aria-hidden />
            Sin eventos todavía. Por WhatsApp: «tacto en el rodeo de cría: 85 preñadas y 15 vacías».
          </div>
        ) : (
          <div className="space-y-4">
            {seasons.map((s) => (
              <div key={s.serviceYear} className="space-y-2">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <p className="col-span-2 font-medium sm:col-span-1">Servicio {s.label}</p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Vacas </span>
                    {count(s.females)}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Preñez </span>
                    <span className="font-semibold">{pct(s.pregnancyPct)}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Parición </span>
                    <span className="font-semibold">{pct(s.calvingPct)}</span>
                    {s.births > 0 ? <span className="text-muted-foreground"> ({s.births})</span> : null}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Destete </span>
                    <span className="font-semibold">{pct(s.weaningPct)}</span>
                    {s.weaned > 0 ? <span className="text-muted-foreground"> ({s.weaned})</span> : null}
                  </p>
                </div>
                {s.events.length > 0 ? (
                  <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                    {s.events.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                        <span className="text-muted-foreground">{fullDay(e.day)}</span>
                        <span className="font-medium">{EVENT_LABEL[e.type]}</span>
                        <span>{eventSummary(e)}</span>
                        <span className="text-xs text-muted-foreground">{e.rodeo ?? "Sin rodeo"}</span>
                        {canEdit ? (
                          <Button variant="ghost" size="icon-sm" disabled={isPending} aria-label={`Borrar ${EVENT_LABEL[e.type]} del ${fullDay(e.day)}`} onClick={() => remove(e.id)}>
                            <Trash2 size={13} />
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {adding ? <ReproEventDialog rodeos={rodeos} onClose={() => setAdding(false)} /> : null}
    </Card>
  );
}
