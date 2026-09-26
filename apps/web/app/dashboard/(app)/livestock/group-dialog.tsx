"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Trash2 } from "lucide-react";
import type { LivestockGroup } from "@repo/core";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteWeighingAction } from "./actions";

const SOURCE_LABEL: Record<string, string> = { WHATSAPP: "WhatsApp", WEB: "Dashboard", EXCEL: "Planilla" };
const number = (value: number, digits = 0) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: digits }).format(value);
const fullDay = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;

/** Historial de pesadas de un grupo, con la evolución del peso promedio. */
export function GroupDialog({ group, canEdit, onClose }: { group: LivestockGroup; canEdit: boolean; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const remove = (id: string) =>
    startTransition(async () => {
      const result = await deleteWeighingAction(id);
      if (!result.success) return void toast.error(result.error);
      toast.success("Pesada borrada");
    });

  const chartData = group.weighings.map((w) => ({ day: fullDay(w.day).slice(0, 5), kg: w.averageKg }));

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {group.animalType} · {group.pastureName}
          </DialogTitle>
          <DialogDescription>
            {group.currentHeads !== null ? `${group.currentHeads} cabezas hoy` : "Sin animales cargados hoy en el potrero"}
            {group.hectares ? ` · ${number(group.hectares, 1)} ha` : ""}
          </DialogDescription>
        </DialogHeader>

        {chartData.length > 1 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={["dataMin - 10", "dataMax + 10"]} />
                <Tooltip formatter={(value) => [`${number(Number(value), 1)} kg`, "Peso promedio"]} />
                <Line dataKey="kg" stroke="#2D6A4F" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}

        {group.weighings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin pesadas todavía.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {[...group.weighings].reverse().map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-muted-foreground">{fullDay(w.day)}</span>
                <span>
                  {w.headCount} cab · <span className="font-medium">{number(w.averageKg, 1)} kg</span>
                </span>
                <span className="text-xs text-muted-foreground">{SOURCE_LABEL[w.source] ?? w.source}</span>
                {canEdit ? (
                  <Button variant="ghost" size="icon-sm" disabled={isPending} aria-label={`Borrar pesada del ${fullDay(w.day)}`} onClick={() => remove(w.id)}>
                    <Trash2 size={13} />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
